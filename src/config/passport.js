import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from './config.js';
import { tokenTypes } from './tokens.js';
import User from '../models/user.model.js';

// Custom token extractor with debugging
const customExtractor = (req) => {
  console.log("=== TOKEN EXTRACTION DEBUG ===");
  console.log("Authorization header:", req.headers.authorization);
  
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  console.log("Extracted token:", token ? token.substring(0, 20) + "..." : "No token");
  
  return token;
};

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: customExtractor,
};

const jwtVerify = async (payload, done) => {
  try {
    console.log("=== JWT VERIFY DEBUG ===");
    console.log("Payload:", payload);
    console.log("Expected token type:", tokenTypes.ACCESS);
    console.log("Actual token type:", payload.type);
    console.log("JWT Secret configured:", !!config.jwt.secret);
    
    if (payload.type !== tokenTypes.ACCESS) {
      console.log("Token type mismatch");
      throw new Error('Invalid token type');
    }
    
    const user = await User.findById(payload.sub);
    console.log("User found:", !!user);
    if (!user) {
      console.log("User not found in database");
      return done(null, false);
    }
    
    console.log("JWT verification successful");
    done(null, user);
  } catch (error) {
    console.log("JWT verification error:", error.message);
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

export { jwtStrategy };
