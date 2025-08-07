import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from './config.js';
import { tokenTypes } from './tokens.js';
import User from '../models/user.model.js';
import { getClientById } from '../services/client.service.js';

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

const clientJwtVerify = async (payload, done) => {
  try {
    console.log("=== CLIENT JWT VERIFY DEBUG ===");
    console.log("Payload:", payload);
    console.log("Expected token type:", tokenTypes.CLIENT_ACCESS);
    console.log("Actual token type:", payload.type);
    console.log("JWT Secret configured:", !!config.jwt.secret);
    
    if (payload.type !== tokenTypes.CLIENT_ACCESS) {
      console.log("Client token type mismatch");
      throw new Error('Invalid client token type');
    }
    
    const client = await getClientById(payload.sub);
    console.log("Client found:", !!client);
    if (!client) {
      console.log("Client not found in database");
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
    
    console.log("Client JWT verification successful");
    console.log("Client ID:", clientWithType.id);
    console.log("Client _id:", clientWithType._id);
    done(null, clientWithType);
  } catch (error) {
    console.log("Client JWT verification error:", error.message);
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
const clientJwtStrategy = new JwtStrategy(jwtOptions, clientJwtVerify);

export { jwtStrategy, clientJwtStrategy };
