"""Integration checks. ANFB_WP_PATH must point to a disposable ANFB_TEST_SITE."""
import hashlib,json,os,shlex,subprocess,tempfile
from pathlib import Path
site=os.environ['ANFB_WP_PATH']
admin=os.environ.get('ANFB_TEST_USER','1')
cli=shlex.split(os.environ.get('ANFB_WP_CLI','wp'))+['--path='+site]
def run(*args,ok=True,user=admin):
    result=subprocess.run(cli+(['--user='+user] if user else [])+list(args),text=True,capture_output=True)
    if ok and result.returncode: raise AssertionError(result.stderr+result.stdout)
    if not ok: assert result.returncode!=0,(args,result.stdout)
    return result.stdout
assert run('eval',"echo defined('ANFB_TEST_SITE') && ANFB_TEST_SITE ? 'isolated' : 'unsafe';").strip()=='isolated'
content='<!-- wp:paragraph --><p>Datos 1.250,50 y 98%. Café 👩🏽‍💻.</p><!-- /wp:paragraph -->'
post=int(run('post','create','--post_type=page','--post_status=draft','--post_title=ANFB CLI test','--post_content='+content,'--porcelain').strip())
def inspect():return json.loads(run('anfb','inspect',str(post),'--format=json'))
try:
 with tempfile.TemporaryDirectory(prefix='anfb-cli-') as directory:
    root=Path(directory);initial=inspect()
    operation={'path':[0],'block':'core/paragraph','op':'entry','config':{'animation':'fade','variation':'up','duration':800}}
    text={'path':[0],'block':'core/paragraph','op':'text','selection':{'text':'1.250,50'},'config':{'effect':'count','end':1250.5,'decimals':2,'decimal':',','thousands':'.'}}
    plan={'version':1,'postId':post,'contentHash':initial['contentHash'],'operations':[operation,text]}
    file=root/'plan.json';file.write_text(json.dumps(plan))
    dry=json.loads(run('anfb','apply',str(post),'--file='+str(file),'--dry-run'))
    assert dry['changed'] and dry['diff'] and inspect()['contentHash']==initial['contentHash']
    run('anfb','apply',str(post),'--file='+str(file),ok=False)
    run('anfb','apply',str(post),'--file='+str(file),'--backup='+site+'/unsafe.json',ok=False)
    backup=root/'before.json'
    run('anfb','apply',str(post),'--file='+str(file),'--backup='+str(backup))
    assert (backup.stat().st_mode&0o777)==0o600
    changed=inspect();assert changed['contentHash']!=initial['contentHash']
    assert run('post','get',str(post),'--field=post_status').strip()=='draft'
    run('anfb','apply',str(post),'--file='+str(file),'--dry-run',ok=False)
    plan['contentHash']=changed['contentHash'];file.write_text(json.dumps(plan))
    assert not json.loads(run('anfb','apply',str(post),'--file='+str(file),'--dry-run'))['changed']
    # Reject a bad later operation without partially applying the first.
    invalid=root/'bad.json';bad=dict(plan);bad['operations']=[dict(operation,config={'animation':'zoom','variation':'in'}),dict(text,path=[99])];invalid.write_text(json.dumps(bad))
    run('anfb','apply',str(post),'--file='+str(invalid),'--backup='+str(root/'bad-backup.json'),ok=False)
    assert inspect()['contentHash']==changed['contentHash'] and not (root/'bad-backup.json').exists()
    run('anfb','inspect',str(post),ok=False,user=None)
    subscriber=int(run('user','create','anfb-cli-subscriber','subscriber@example.invalid','--role=subscriber','--porcelain').strip())
    try:run('anfb','inspect',str(post),ok=False,user=str(subscriber))
    finally:run('user','delete',str(subscriber),'--yes')
    cleared=root/'clear.json'
    run('anfb','clear',str(post),'--backup='+str(cleared))
    assert not inspect()['blocks'][0]['effects'] and inspect()['blocks'][0]['entry'] is None
    run('anfb','restore',str(post),'--file='+str(backup),ok=False)
    run('anfb','restore',str(post),'--file='+str(cleared))
    assert inspect()['contentHash']==changed['contentHash']
    run('anfb','restore',str(post),'--file='+str(backup))
    assert inspect()['contentHash']==initial['contentHash']
 print('CLI checks passed: inspect, dry-run, permissions, atomic validation, stale plans, idempotence, private backup, clear, restore.')
finally:run('post','delete',str(post),'--force')
