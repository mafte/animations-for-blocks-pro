/**
 * Device detector via matchMedia
 */

const phone = () =>
  matchMedia('(pointer: coarse) and (hover: none) and (max-width: 767px)')
    .matches;

const mobile = () => matchMedia('(pointer: coarse) and (hover: none)').matches;

const tablet = () => mobile() && !phone();

export default { phone, mobile, tablet };
