import express from 'express';
import authRoute from './auth.route.js';
import userRoute from './user.route.js';
import teamMemberRoute from './teamMember.route.js';
import activityRoute from './activity.route.js';
import branchRoute from './branch.route.js';
import clientRoute from './client.route.js';
import clientAuthRoute from './clientAuth.route.js';
import clientFileManagerRoute from './clientFileManager.route.js';
import groupRoute from './group.route.js';
import roleRoute from './role.route.js';
import timelineRoute from './timeline.route.js';
import dashboardRoute from './dashboard.route.js';
import docsRoute from './docs.route.js';
import config from '../../config/config.js';
import commonRoute from './common.route.js';
import fileManagerRoute from './fileManager.route.js';
import commonEmailRoute from './common.email.route.js';
import taskRoute from './task.route.js';
import cronRoute from './cron.route.js';
import analyticsRoute from './analytics.route.js';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/team-members',
    route: teamMemberRoute,
  },
  {
    path: '/activities',
    route: activityRoute,
  },
  {
    path: '/branches',
    route: branchRoute,
  },
  {
    path: '/clients',
    route: clientRoute,
  },
  {
    path: '/client-auth',
    route: clientAuthRoute,
  },
  {
    path: '/client-file-manager',
    route: clientFileManagerRoute,
  },
  {
    path: '/groups',
    route: groupRoute,
  },
  {
    path: '/roles',
    route: roleRoute,
  },
  {
    path: '/timelines',
    route: timelineRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/tasks',
    route: taskRoute,
  },
  {
    path: '/cron',
    route: cronRoute,
  },
  {
    path: '/analytics',
    route: analyticsRoute,
  },
  {
    path: '/common',
    route: commonRoute,
  },
  {
    path: '/file-manager',
    route: fileManagerRoute,
  },
  {
    path: '/common-email',
    route: commonEmailRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;
