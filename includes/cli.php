<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

/** Inspect and edit Animations for Blocks without replacing page layouts. */
class Animation_CLI {
	private function post($args) {
		if (!get_current_user_id()) {
			throw new \RuntimeException('Use --user=<id|login> with permission to edit this post.');
		}
		$id = $args[0] ?? '';
		if (!ctype_digit((string) $id) || !($post = get_post((int) $id)) || !current_user_can('edit_post', $post->ID) || in_array($post->post_type, ['revision', 'attachment'], true)) {
			throw new \RuntimeException('Post unavailable or permission denied.');
		}
		return $post;
	}

	private function read_json($path) {
		if (!is_string($path) || !is_readable($path) || filesize($path) > 10 * 1024 * 1024) {
			throw new \RuntimeException('Readable JSON file up to 10 MB required.');
		}
		return json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
	}

	private function report($data) {
		\WP_CLI::line(wp_json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
	}

	/**
	 * Inspect block paths, text nodes, effects and available capabilities.
	 *
	 * @synopsis <post-id> [--format=<format>]
	 */
	public function inspect($args, $assoc) {
		$this->run(function () use ($args, $assoc) {
			if (isset($assoc['format']) && $assoc['format'] !== 'json') {
				throw new \InvalidArgumentException('Only --format=json is supported.');
			}
			$post = $this->post($args);
			$this->report(['version' => 1, 'postId' => $post->ID, 'contentHash' => hash('sha256', $post->post_content), 'capabilities' => animation_schema(), 'blocks' => inspect_blocks(parse_blocks($post->post_content))]);
		});
	}

	/**
	 * Validate or apply a JSON plan. Use --dry-run or --backup=<private-file>.
	 *
	 * @synopsis <post-id> --file=<file> [--dry-run] [--backup=<file>]
	 */
	public function apply($args, $assoc) {
		$this->run(function () use ($args, $assoc) {
			$post = $this->post($args);
			$plan = $this->read_json($assoc['file'] ?? null);
			if (!is_array($plan) || array_diff(array_keys($plan), ['version', 'postId', 'contentHash', 'operations']) || ($plan['version'] ?? null) !== 1 || ($plan['postId'] ?? null) !== $post->ID || ($plan['contentHash'] ?? '') !== hash('sha256', $post->post_content)) {
				throw new \RuntimeException('Invalid or outdated plan. Inspect the page again.');
			}
			$this->save($post, transform_content($post->post_content, $plan['operations'] ?? null), $assoc);
		});
	}

	/**
	 * Clear a page, or selected block paths with --paths='[[0],[2,1]]'.
	 *
	 * @synopsis <post-id> [--paths=<json>] [--dry-run] [--backup=<file>]
	 */
	public function clear($args, $assoc) {
		$this->run(function () use ($args, $assoc) {
			$post = $this->post($args);
			$blocks = parse_blocks($post->post_content);
			$operations = [];
			$skipped = [];
			if (isset($assoc['paths'])) {
				$paths = json_decode($assoc['paths'], true, 512, JSON_THROW_ON_ERROR);
				if (!is_array($paths) || !array_is_list($paths)) {
					throw new \InvalidArgumentException('Paths must be an array of block paths.');
				}
				foreach ($paths as $path) {
					$block =& block_at_path($blocks, $path);
					$operations[] = ['op' => 'clear', 'path' => $path, 'block' => $block['blockName']];
					unset($block);
				}
			} else {
				$walk = function ($nodes) use (&$walk, &$operations, &$skipped) {
					foreach ($nodes as $node) {
						if (!$node['editable']) {
							if ($node['block'] !== null) {
								$skipped[] = ['path' => $node['path'], 'source' => $node['source']];
							}
							continue;
						}
						$operations[] = ['op' => 'clear', 'path' => $node['path'], 'block' => $node['block']];
						$walk($node['children']);
					}
				};
				$walk(inspect_blocks($blocks));
			}
			$this->save($post, transform_content($post->post_content, $operations), $assoc, ['skipped' => $skipped]);
		});
	}

	/**
	 * Migrate one page to plugin-independent storage, without changing referenced sources.
	 *
	 * @synopsis <post-id> --content-hash=<hash> [--dry-run] [--backup=<file>]
	 */
	public function migrate($args, $assoc) {
		$this->run(function () use ($args, $assoc) {
			$post = $this->post($args);
			if (($assoc['content-hash'] ?? '') !== hash('sha256', $post->post_content)) {
				throw new \RuntimeException('Page changed; inspect again before migrating.');
			}
			$result = migrate_content($post->post_content);
			$this->save($post, $result['content'], $assoc, ['pendingSources' => $result['pendingSources'], 'complete' => !$result['pendingSources']]);
		});
	}

	/**
	 * Restore a private backup only while its resulting page remains unchanged.
	 *
	 * @synopsis <post-id> --file=<file> [--dry-run]
	 */
	public function restore($args, $assoc) {
		$this->run(function () use ($args, $assoc) {
			$post = $this->post($args);
			$backup = $this->read_json($assoc['file'] ?? null);
			if (($backup['version'] ?? null) !== 1 || ($backup['site'] ?? '') !== $this->site() || ($backup['postId'] ?? null) !== $post->ID || !is_string($backup['content'] ?? null) || ($backup['beforeHash'] ?? '') !== hash('sha256', $backup['content']) || ($backup['afterHash'] ?? '') !== hash('sha256', $post->post_content)) {
				throw new \RuntimeException('Backup mismatch, damaged backup or page changed since apply.');
			}
			$this->save($post, $backup['content'], $assoc, ['restored' => true], false);
		});
	}

	private function site() {
		return hash('sha256', ABSPATH . '|' . get_current_blog_id() . '|' . home_url());
	}

	private function save($post, $content, $assoc, $extra = [], $backup_required = true) {
		$before = hash('sha256', $post->post_content);
		$after = hash('sha256', $content);
		$report = array_merge(['postId' => $post->ID, 'dryRun' => isset($assoc['dry-run']), 'changed' => $before !== $after, 'beforeHash' => $before, 'afterHash' => $after, 'diff' => $this->diff($post->post_content, $content)], $extra);
		if (isset($assoc['dry-run']) || $before === $after) {
			$this->report($report);
			return;
		}
		if ($backup_required) {
			$this->backup($assoc['backup'] ?? null, ['version' => 1, 'site' => $this->site(), 'postId' => $post->ID, 'beforeHash' => $before, 'afterHash' => $after, 'content' => $post->post_content]);
		}
		clean_post_cache($post->ID);
		if (get_post($post->ID)->post_content !== $post->post_content) {
			throw new \RuntimeException('Page changed during this operation; no update made.');
		}
		require_once ABSPATH . 'wp-admin/includes/post.php';
		if (wp_check_post_lock($post->ID)) {
			throw new \RuntimeException('Another user is editing this page.');
		}
		$result = wp_update_post(wp_slash(['ID' => $post->ID, 'post_content' => $content]), true);
		if (is_wp_error($result)) {
			throw new \RuntimeException($result->get_error_message());
		}
		if (get_post($post->ID)->post_content !== $content) {
			throw new \RuntimeException('A WordPress filter changed the saved content. Inspect the page and backup before continuing.');
		}
		$this->report($report);
	}

	private function backup($path, $data) {
		$directory = is_string($path) ? realpath(dirname($path)) : false;
		$public = realpath(ABSPATH);
		if (!$directory || !str_starts_with($path, '/') || $directory === $public || str_starts_with($directory . '/', $public . '/') || is_link($path)) {
			throw new \RuntimeException('Backup must use an absolute path in an existing private directory outside WordPress.');
		}
		$old_mask = umask(0077);
		$handle = fopen($path, 'x');
		umask($old_mask);
		if (!$handle) {
			throw new \RuntimeException('Cannot create backup; use a new filename.');
		}
		$json = wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		$written = fwrite($handle, $json);
		fclose($handle);
		if ($written !== strlen($json)) {
			unlink($path);
			throw new \RuntimeException('Backup write failed; page not updated.');
		}
	}

	private function diff($before, $after) {
		if ($before === $after) {
			return [];
		}
		require_once ABSPATH . WPINC . '/wp-diff.php';
		$diff = new \Text_Diff(explode("\n", $before), explode("\n", $after));
		$result = [];
		foreach ($diff->getDiff() as $change) {
			if (get_class($change) !== 'Text_Diff_Op_copy') {
				$result[] = ['removed' => $change->orig ?? [], 'added' => $change->final ?? []];
			}
		}
		return $result;
	}

	private function run($callback) {
		try {
			$callback();
		} catch (\Throwable $error) {
			\WP_CLI::error($error->getMessage());
		}
	}
}

\WP_CLI::add_command('anfb', __NAMESPACE__ . '\\Animation_CLI');
