import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

const { version } = packageJson;
import config from '../config/config.js';


const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'node-express-boilerplate API documentation',
    version,
    license: {
      name: 'MIT',
      url: 'https://github.com/hagopj13/node-express-boilerplate/blob/master/LICENSE',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
    },
  ],
};

export default swaggerDef;

