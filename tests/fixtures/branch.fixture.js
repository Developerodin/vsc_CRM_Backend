import mongoose from 'mongoose';
import faker from 'faker';
import Branch from '../../src/models/branch.model.js';

const branchOne = {
  _id: mongoose.Types.ObjectId(),
  name: faker.company.companyName(),
  branchHead: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  phone: '+919876543210',
  address: faker.address.streetAddress(),
  city: faker.address.city(),
  state: faker.address.state(),
  country: faker.address.country(),
  pinCode: '123456',
  sortOrder: 1,
};

const branchTwo = {
  _id: mongoose.Types.ObjectId(),
  name: faker.company.companyName(),
  branchHead: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  phone: '+919876543211',
  address: faker.address.streetAddress(),
  city: faker.address.city(),
  state: faker.address.state(),
  country: faker.address.country(),
  pinCode: '123457',
  sortOrder: 2,
};

const insertBranches = async (branches) => {
  await Branch.insertMany(branches);
};

export { branchOne, branchTwo, insertBranches };
