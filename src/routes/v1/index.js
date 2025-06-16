import express from 'express';
import authRoute from './auth.route.js';
import userRoute from './user.route.js';
import teamMemberRoute from './teamMember.route.js';
import activityRoute from './activity.route.js';
import branchRoute from './branch.route.js';
import clientRoute from './client.route.js';
import groupRoute from './group.route.js';
import docsRoute from './docs.route.js';
import config from '../../config/config.js';

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
    path: '/groups',
    route: groupRoute,
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
