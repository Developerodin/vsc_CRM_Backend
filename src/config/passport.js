import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from './config.js';
import { tokenTypes } from './tokens.js';
import User from '../models/user.model.js';
import { getClientById } from '../services/client.service.js';

// Custom token extractor
const customExtractor = (req) => {
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: customExtractor,
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const clientJwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.CLIENT_ACCESS) {
      throw new Error('Invalid client token type');
    }
    
    const client = await getClientById(payload.sub);
    if (!client) {
      return done(null, false);
    }
    
    // Convert to plain object and ensure ID consistency
    const clientObj = client.toObject();
    
    // Add userType and ensure both _id and id are available
    const clientWithType = {
      ...clientObj,
      _id: clientObj._id,
      id: clientObj._id.toString(),
      userType: 'client'
    };
    
    done(null, clientWithType);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
const clientJwtStrategy = new JwtStrategy(jwtOptions, clientJwtVerify);

export { jwtStrategy, clientJwtStrategy };
