import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 5
  },
  in: {
    opacity: 1,
    y: 0
  },
  out: {
    opacity: 0,
    y: -5
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
};

const MainLayout = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <motion.main
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Outlet />
      </motion.main>
      <Toaster />
    </div>
  );
};

export default MainLayout;