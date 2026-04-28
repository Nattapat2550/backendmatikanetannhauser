const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protect, authorize } = require('../../middleware/auth');

// Mock the dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/User');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    it('should return 401 if no token is provided', async () => {
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not authorize to access this route' })
      );
    });

    it('should return 401 if token is the string "null"', async () => {
      req.headers.authorization = 'Bearer null';
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next() and set req.user if token is valid', async () => {
      const mockDecoded = { id: 'user123' };
      const mockUser = { _id: 'user123', name: 'John Doe' };

      req.headers.authorization = 'Bearer validtoken';
      jwt.verify.mockReturnValue(mockDecoded);
      User.findById.mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('validtoken', process.env.JWT_SECRET);
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if jwt verification fails', async () => {
      req.headers.authorization = 'Bearer invalidtoken';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should return 403 if user role is not in the allowed roles', () => {
      req.user = { role: 'user' };
      
      // Call authorize with 'admin' only
      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: expect.stringContaining('User role user is not authorized') 
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user role is included in allowed roles', () => {
      req.user = { role: 'admin' };
      
      const middleware = authorize('user', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});