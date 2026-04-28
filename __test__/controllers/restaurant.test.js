const mongoose = require('mongoose');

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/Restaurant');
jest.mock('../../models/Reservation.js');
jest.mock('../../models/Comment.js');

const Restaurant = require('../../models/Restaurant.js');
const Reservation = require('../../models/Reservation.js');
const controller = require('../../controllers/restaurants.js'); // adjust path as needed

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validId = new mongoose.Types.ObjectId().toString();
const invalidId = 'not-a-valid-id';

// ─── getRestaurants ───────────────────────────────────────────────────────────

describe('getRestaurants', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns paginated restaurants with status 200', async () => {
    const fakeRestaurants = [{ _id: validId, name: 'Test' }];

    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeRestaurants),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(1);

    const req = { query: { page: '1', limit: '10' } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1 })
    );
  });

  it('includes pagination.next when more pages exist', async () => {
    const fakeRestaurants = Array(10).fill({ _id: validId });

    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeRestaurants),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(100); // many pages

    const req = { query: { page: '1', limit: '10' } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.next).toEqual({ page: 2, limit: 10 });
  });

  it('includes pagination.prev on pages after the first', async () => {
    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(100);

    const req = { query: { page: '3', limit: '10' } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.prev).toEqual({ page: 2, limit: 10 });
  });

  it('applies select fields when provided', async () => {
    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(0);

    const req = { query: { select: 'name,address' } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    expect(queryChain.select).toHaveBeenCalledWith('name address');
  });

  it('applies sort fields when provided', async () => {
    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(0);

    const req = { query: { sort: 'name,rating' } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    expect(queryChain.sort).toHaveBeenCalledWith('name rating');
  });

  it('transforms comparison operators (gt, gte, lt, lte, in) into MongoDB $ prefixed operators', async () => {
    const fakeRestaurants = [{ _id: validId, name: 'Cheap Eats' }];

    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeRestaurants),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(1);

    // Passing a MongoDB-style range filter — triggers the replace callback for 'gt' and 'lte'
    const req = { query: { priceRange: { gt: '100', lte: '500' } } };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    // Verify Restaurant.find was called with $ prefixed operators
    const findArg = Restaurant.find.mock.calls[0][0];
    expect(JSON.stringify(findArg)).toContain('$gt');
    expect(JSON.stringify(findArg)).toContain('$lte');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('returns 500 on database error', async () => {
    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB failure')),
    };

    Restaurant.find.mockReturnValue(queryChain);
    Restaurant.countDocuments.mockResolvedValue(0);

    const req = { query: {} };
    const res = mockRes();

    await controller.getRestaurants(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });
});

// ─── getRestaurant ────────────────────────────────────────────────────────────

describe('getRestaurant', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns a restaurant by id with status 200', async () => {
    const fakeRestaurant = { _id: validId, name: 'Test' };
    const queryChain = {
      populate: jest.fn().mockReturnThis(),
    };
    // Last populate resolves to the restaurant
    queryChain.populate.mockImplementation(function () {
      this._resolved = fakeRestaurant;
      return this;
    });

    Restaurant.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: (resolve) => resolve(fakeRestaurant),
    });

    // Simpler: make findById chain resolve directly
    const chain = { populate: jest.fn().mockReturnThis() };
    // Make it thenable so `await query` resolves
    chain[Symbol.iterator] = undefined;
    Object.defineProperty(chain, 'then', {
      get: () => (fn) => Promise.resolve(fakeRestaurant).then(fn),
    });
    Restaurant.findById.mockReturnValue(chain);

    const req = { params: { id: validId } };
    const res = mockRes();

    await controller.getRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeRestaurant });
  });

  it('returns 400 for an invalid ObjectId', async () => {
    const req = { params: { id: invalidId } };
    const res = mockRes();

    await controller.getRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Invalid restaurant ID' })
    );
  });

  it('returns 404 when restaurant does not exist', async () => {
    const chain = { populate: jest.fn().mockReturnThis() };
    Object.defineProperty(chain, 'then', {
      get: () => (fn) => Promise.resolve(null).then(fn),
    });
    Restaurant.findById.mockReturnValue(chain);

    const req = { params: { id: validId } };
    const res = mockRes();

    await controller.getRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on database error', async () => {
    Restaurant.findById.mockImplementation(() => {
      throw new Error('DB error');
    });

    const req = { params: { id: validId } };
    const res = mockRes();

    await controller.getRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── createRestaurant ─────────────────────────────────────────────────────────

describe('createRestaurant', () => {
  afterEach(() => jest.clearAllMocks());

  const baseReq = () => ({
    body: { name: 'New Place', address: '123 St' },
    user: { id: 'user123' },
  });

  it('creates a restaurant and returns 201', async () => {
    const created = { _id: validId, name: 'New Place' };
    Restaurant.create.mockResolvedValue(created);

    const req = baseReq();
    const res = mockRes();

    await controller.createRestaurant(req, res);

    expect(Restaurant.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'user123', user: 'user123' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
  });

  it('returns 400 on ValidationError', async () => {
    const validationError = {
      name: 'ValidationError',
      errors: {
        name: { message: 'Name is required' },
      },
    };
    Restaurant.create.mockRejectedValue(validationError);

    const req = baseReq();
    const res = mockRes();

    await controller.createRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errors: ['Name is required'] })
    );
  });

  it('returns 400 on duplicate key error (code 11000)', async () => {
    const dupError = { code: 11000 };
    Restaurant.create.mockRejectedValue(dupError);

    const req = baseReq();
    const res = mockRes();

    await controller.createRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Restaurant name already exists' })
    );
  });

  it('returns 500 on generic error', async () => {
    Restaurant.create.mockRejectedValue(new Error('Unexpected'));

    const req = baseReq();
    const res = mockRes();

    await controller.createRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── updateRestaurant ─────────────────────────────────────────────────────────

describe('updateRestaurant', () => {
  afterEach(() => jest.clearAllMocks());

  const ownerReq = (overrides = {}) => ({
    params: { id: validId },
    body: { name: 'Updated' },
    user: { id: 'owner123', role: 'user' },
    ...overrides,
  });

  it('updates a restaurant and returns 200', async () => {
    const existing = { _id: validId, user: { toString: () => 'owner123' } };
    const updated = { _id: validId, name: 'Updated' };

    Restaurant.findById.mockResolvedValue(existing);
    Restaurant.findByIdAndUpdate.mockResolvedValue(updated);

    const req = ownerReq();
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('returns 400 for an invalid ObjectId', async () => {
    const req = ownerReq({ params: { id: invalidId } });
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when restaurant does not exist', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const req = ownerReq();
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 401 when user is not the owner and not admin', async () => {
    const existing = { _id: validId, user: { toString: () => 'someone-else' } };
    Restaurant.findById.mockResolvedValue(existing);

    const req = ownerReq({ user: { id: 'intruder', role: 'user' } });
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('allows admin to update any restaurant', async () => {
    const existing = { _id: validId, user: { toString: () => 'someone-else' } };
    const updated = { _id: validId, name: 'Updated by admin' };

    Restaurant.findById.mockResolvedValue(existing);
    Restaurant.findByIdAndUpdate.mockResolvedValue(updated);

    const req = ownerReq({ user: { id: 'admin1', role: 'admin' } });
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 on ValidationError', async () => {
    const existing = { _id: validId, user: { toString: () => 'owner123' } };
    Restaurant.findById.mockResolvedValue(existing);

    const validationError = {
      name: 'ValidationError',
      errors: { name: { message: 'Name too long' } },
    };
    Restaurant.findByIdAndUpdate.mockRejectedValue(validationError);

    const req = ownerReq();
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errors: ['Name too long'] })
    );
  });

  it('returns 500 on generic database error', async () => {
    const existing = { _id: validId, user: { toString: () => 'owner123' } };
    Restaurant.findById.mockResolvedValue(existing);
    Restaurant.findByIdAndUpdate.mockRejectedValue(new Error('Unexpected DB error'));

    const req = ownerReq();
    const res = mockRes();

    await controller.updateRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });
});

// ─── deleteRestaurant ─────────────────────────────────────────────────────────

describe('deleteRestaurant', () => {
  afterEach(() => jest.clearAllMocks());

  const ownerReq = (overrides = {}) => ({
    params: { id: validId },
    user: { id: 'owner123', role: 'user' },
    ...overrides,
  });

  it('deletes a restaurant and its reservations, returns 200', async () => {
    const existing = { _id: validId, user: { toString: () => 'owner123' } };
    Restaurant.findById.mockResolvedValue(existing);
    Reservation.deleteMany.mockResolvedValue({});
    Restaurant.deleteOne.mockResolvedValue({});

    const req = ownerReq();
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(Reservation.deleteMany).toHaveBeenCalledWith({ restaurant: validId });
    expect(Restaurant.deleteOne).toHaveBeenCalledWith({ _id: validId });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('returns 400 for an invalid ObjectId', async () => {
    const req = ownerReq({ params: { id: invalidId } });
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when restaurant does not exist', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const req = ownerReq();
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 401 when non-owner non-admin tries to delete', async () => {
    const existing = { _id: validId, user: { toString: () => 'someone-else' } };
    Restaurant.findById.mockResolvedValue(existing);

    const req = ownerReq({ user: { id: 'intruder', role: 'user' } });
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Reservation.deleteMany).not.toHaveBeenCalled();
  });

  it('allows admin to delete any restaurant', async () => {
    const existing = { _id: validId, user: { toString: () => 'someone-else' } };
    Restaurant.findById.mockResolvedValue(existing);
    Reservation.deleteMany.mockResolvedValue({});
    Restaurant.deleteOne.mockResolvedValue({});

    const req = ownerReq({ user: { id: 'admin1', role: 'admin' } });
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 on database error', async () => {
    Restaurant.findById.mockRejectedValue(new Error('DB crash'));

    const req = ownerReq();
    const res = mockRes();

    await controller.deleteRestaurant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});