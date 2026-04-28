const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Model', () => {

  describe('Validation', () => {
    it('should be invalid if name is empty', async () => {
      const user = new User({ email: 'test@test.com', telephone: '0812345678' });
      const err = user.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should be invalid if email format is incorrect', async () => {
      const user = new User({ email: 'invalid-email', telephone: '0812345678' });
      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should be invalid if telephone format is incorrect', async () => {
      const user = new User({ email: 'test@test.com', telephone: '123' }); // Must start with 06, 08, 09
      const err = user.validateSync();
      expect(err.errors.telephone).toBeDefined();
    });

    it('should have a default role of "user"', () => {
      const user = new User({ name: 'John' });
      expect(user.role).toBe('user');
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(() => {
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        name: 'John Doe',
        password: 'password123'
      });
      process.env.JWT_SECRET = 'testsecret';
      process.env.JWT_EXPIRE = '30d';
    });

    it('getSignedJwtToken should return a signed token', () => {
      jwt.sign.mockReturnValue('mockToken');

      const token = user.getSignedJwtToken();

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user._id },
        'testsecret',
        { expiresIn: '30d' }
      );
      expect(token).toBe('mockToken');
    });

    it('matchPassword should return true if passwords match', async () => {
      bcrypt.compare.mockResolvedValue(true);

      const isMatch = await user.matchPassword('password123');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', user.password);
      expect(isMatch).toBe(true);
    });
  });

  describe('Pre-save Hook (Password Hashing)', () => {
    it('should generate a salt and hash the password before saving', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@gmail.com',
        telephone: '0812345678',
        password: 'plainpassword123'
      });

      const mockSalt = 'mocked_salt_123';
      const mockHash = 'mocked_hashed_password';

      bcrypt.genSalt.mockResolvedValue(mockSalt);
      bcrypt.hash.mockResolvedValue(mockHash);

      // Alternative way: find the specific middleware function and call it
      // Mongoose stores hooks in an array; we find the one responsible for 'save'
      const saveHooks = User.schema.s.hooks._pres.get('save');
      const hashMiddleware = saveHooks.find(hook => hook.fn.toString().includes('bcrypt'));

      if (hashMiddleware) {
        // Bind the user instance to 'this' and execute
        await hashMiddleware.fn.call(user, jest.fn());
      } else {
        // Fallback: If the above lookup is too brittle, manually call the hook by name 
        // if your Mongoose version supports it:
        await User.schema.eachPath((path) => { }); // Initialization check
        // Direct call to the hook logic using Mongoose's internal 'apply'
        await new Promise((resolve) => {
          User.schema.callPost('save', user, resolve); // This is a bit deep-internal
        });
      }

      // Assertions
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('plainpassword123', mockSalt);
      expect(user.password).toBe(mockHash);
    });
  });
});