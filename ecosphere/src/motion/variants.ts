// Shared Framer Motion animation variants
export const cardEntrance = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
};

export const cardHover = {
  rest: { y: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' },
  hover: {
    y: -3,
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

export const xpBarFill = (percent: number) => ({
  initial: { width: 0 },
  animate: { width: `${percent}%`, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
});

export const tabIndicator = {
  layoutId: 'tab-indicator',
  transition: { type: 'spring', stiffness: 380, damping: 30 }
};

export const countUp = { type: 'spring', stiffness: 100, damping: 20 };
