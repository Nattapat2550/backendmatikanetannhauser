const mongoose = require('mongoose');

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/Reservation');
jest.mock('../../models/Restaurant');

const Reservation = require('../../models/Reservation');
const Restaurant = require('../../models/Restaurant');
const controller = require('../../controllers/reservation');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = new mongoose.Types.ObjectId().toString();
const validRestaurantId = new mongoose.Types.ObjectId().toString();

const makeReservation = (overrides = {}) => ({
    _id: validId,
    user: { _id: { toString: () => 'user123' } },
    restaurant: {
        _id: validRestaurantId,
        openTime: '09:00',
        closeTime: '21:00',
    },
    startDateTime: new Date('2025-01-01T10:00:00.000Z'),
    endDateTime: new Date('2025-01-01T12:00:00.000Z'),
    deleteOne: jest.fn().mockResolvedValue({}),
    populate: jest.fn().mockResolvedValue({}),
    ...overrides,
});

const makeRestaurant = (overrides = {}) => ({
    _id: validRestaurantId,
    openTime: '09:00',
    closeTime: '21:00',
    ...overrides,
});

// ─── getReservations ──────────────────────────────────────────────────────────

describe('getReservations', () => {
    afterEach(() => jest.clearAllMocks());

    const makeQuery = (results = []) => ({
        populate: jest.fn().mockResolvedValue(results),
    });

    it('returns own reservations for a regular user (no restaurantId)', async () => {
        const fakeReservations = [makeReservation()];
        Reservation.find.mockReturnValue(makeQuery(fakeReservations));

        const req = {
            user: { id: 'user123', role: 'user' },
            params: {},
        };
        const res = mockRes();

        await controller.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({ user: 'user123' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, count: 1 })
        );
    });

    it('filters by restaurant when restaurantId param is present (regular user)', async () => {
        Reservation.find.mockReturnValue(makeQuery([]));

        const req = {
            user: { id: 'user123', role: 'user' },
            params: { restaurantId: validRestaurantId },
        };
        const res = mockRes();

        await controller.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({
            user: 'user123',
            restaurant: validRestaurantId,
        });
    });

    it('returns all reservations for admin (no restaurantId)', async () => {
        const fakeReservations = [makeReservation(), makeReservation()];
        Reservation.find.mockReturnValue(makeQuery(fakeReservations));

        const req = {
            user: { id: 'admin1', role: 'admin' },
            params: {},
        };
        const res = mockRes();

        await controller.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, count: 2 })
        );
    });

    it('filters by restaurant for admin when restaurantId is present', async () => {
        Reservation.find.mockReturnValue(makeQuery([]));

        const req = {
            user: { id: 'admin1', role: 'admin' },
            params: { restaurantId: validRestaurantId },
        };
        const res = mockRes();

        await controller.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({ restaurant: validRestaurantId });
    });

    it('returns 500 on database error', async () => {
        Reservation.find.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error')),
        });

        const req = {
            user: { id: 'user123', role: 'user' },
            params: {},
        };
        const res = mockRes();

        await controller.getReservations(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot find Reservation' })
        );
    });
});

// ─── getReservation ───────────────────────────────────────────────────────────

describe('getReservation', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns a single reservation for the owner', async () => {
        const fake = makeReservation();
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fake) });

        const req = { params: { id: validId }, user: { id: 'user123', role: 'user' } };
        const res = mockRes();

        await controller.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: fake });
    });

    it('returns a reservation for admin even if not the owner', async () => {
        const fake = makeReservation();
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fake) });

        const req = { params: { id: validId }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();

        await controller.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when reservation does not exist', async () => {
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

        const req = { params: { id: validId }, user: { id: 'user123', role: 'user' } };
        const res = mockRes();

        await controller.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it('returns 401 when a non-owner non-admin tries to view', async () => {
        const fake = makeReservation(); // owner is 'user123'
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fake) });

        const req = { params: { id: validId }, user: { id: 'intruder', role: 'user' } };
        const res = mockRes();

        await controller.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 500 on database error', async () => {
        Reservation.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error')),
        });

        const req = { params: { id: validId }, user: { id: 'user123', role: 'user' } };
        const res = mockRes();

        await controller.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ─── addReservation ───────────────────────────────────────────────────────────

describe('addReservation', () => {
    afterEach(() => jest.clearAllMocks());

    const baseReq = (overrides = {}) => ({
        params: { restaurantId: validRestaurantId },
        body: {
            startDateTime: '2025-01-01T10:00:00.000Z',
            endDateTime: '2025-01-01T12:00:00.000Z',
        },
        user: { id: 'user123', role: 'user' },
        ...overrides,
    });

    const setupHappyPath = (existingCount = 0) => {
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        Reservation.find.mockResolvedValue(Array(existingCount).fill({}));
        const created = { ...makeReservation(), populate: jest.fn().mockResolvedValue({}) };
        Reservation.create.mockResolvedValue(created);
        return created;
    };

    it('creates a reservation and returns 200', async () => {
        const created = setupHappyPath(0);
        const req = baseReq();
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(Reservation.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });

    it('returns 404 when restaurant does not exist', async () => {
        Restaurant.findById.mockResolvedValue(null);

        const req = baseReq();
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it('returns 400 when start and end are on different dates', async () => {
        Restaurant.findById.mockResolvedValue(makeRestaurant());

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T10:00:00.000Z',
                endDateTime: '2025-01-02T12:00:00.000Z',
            },
        });
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('same day') })
        );
    });

    it('returns 400 when endTime is not after startTime', async () => {
        Restaurant.findById.mockResolvedValue(makeRestaurant());

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T12:00:00.000Z',
                endDateTime: '2025-01-01T10:00:00.000Z',
            },
        });
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('End Time') })
        );
    });

    it('returns 400 when reservation is outside restaurant open hours', async () => {
        Restaurant.findById.mockResolvedValue(makeRestaurant({ openTime: '09:00', closeTime: '11:00' }));

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T10:00:00.000Z',
                endDateTime: '2025-01-01T12:00:00.000Z', // closes at 11:00
            },
        });
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Restarant time') })
        );
    });

    it('returns 400 when regular user already has 3 reservations', async () => {
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        Reservation.find.mockResolvedValue([{}, {}, {}]); // 3 existing

        const req = baseReq();
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('3 reservations') })
        );
    });

    it('allows admin to create even when 3+ reservations exist', async () => {
        const created = setupHappyPath(5);
        Reservation.find.mockResolvedValue([{}, {}, {}, {}, {}]); // 5 existing, but admin
        const req = baseReq({ user: { id: 'admin1', role: 'admin' } });
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('normalises malformed startDateTime (no dot before ms) before processing', async () => {
        // The regex targets strings like '2025-01-01T10:00:00000Z' (no dot before milliseconds)
        // and rewrites them to '2025-01-01T10:00:00.000Z'
        // Mocks are set inline (not via setupHappyPath) to ensure clearAllMocks cannot interfere
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        Reservation.find.mockResolvedValue([]);
        const created = makeReservation();
        created.populate = jest.fn().mockResolvedValue(created);
        Reservation.create.mockResolvedValue(created);

        const req = {
            params: { restaurantId: validRestaurantId },
            body: {
                startDateTime: '2025-01-01T10:00:00000Z', // malformed — no dot before ms
                endDateTime:   '2025-01-01T12:00:00000Z', // malformed — no dot before ms
            },
            user: { id: 'user123', role: 'user' },
        };
        const res = mockRes();

        await controller.addReservation(req, res);

        // Confirm the body strings were mutated by the replace branch
        expect(req.body.startDateTime).toBe('2025-01-01T10:00:00.000Z');
        expect(req.body.endDateTime).toBe('2025-01-01T12:00:00.000Z');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('covers false branch of startDateTime typeof check (non-string falls through to catch)', async () => {
        // When startDateTime is not a string, the if is false (false branch covered).
        // .slice() then throws on the non-string value, landing in the catch → 500.
        // This is the only way to exercise the false branch given the controller's design.
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        Reservation.find.mockResolvedValue([]);

        const req = {
            params: { restaurantId: validRestaurantId },
            body: {
                startDateTime: 12345, // number — typeof !== "string", false branch taken
                endDateTime:   '2025-01-01T12:00:00.000Z',
            },
            user: { id: 'user123', role: 'user' },
        };
        const res = mockRes();

        await controller.addReservation(req, res);

        // .slice() on a number throws → caught → 500
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('covers false branch of endDateTime typeof check (non-string falls through to catch)', async () => {
        // When endDateTime is not a string, the if is false (false branch covered).
        // .slice() then throws on the non-string value, landing in the catch → 500.
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        Reservation.find.mockResolvedValue([]);

        const req = {
            params: { restaurantId: validRestaurantId },
            body: {
                startDateTime: '2025-01-01T10:00:00000Z', // malformed string — true branch, gets normalised
                endDateTime:   12345,                      // number — typeof !== "string", false branch taken
            },
            user: { id: 'user123', role: 'user' },
        };
        const res = mockRes();

        await controller.addReservation(req, res);

        // .slice() on a number throws → caught → 500
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 on database error', async () => {
        Restaurant.findById.mockRejectedValue(new Error('DB crash'));

        const req = baseReq();
        const res = mockRes();

        await controller.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });
});

// ─── updateReservation ────────────────────────────────────────────────────────

describe('updateReservation', () => {
    afterEach(() => jest.clearAllMocks());

    const baseReq = (overrides = {}) => ({
        params: { id: validId },
        body: {
            startDateTime: '2025-01-01T10:00:00.000Z',
            endDateTime: '2025-01-01T12:00:00.000Z',
        },
        user: { id: 'user123', role: 'user' },
        ...overrides,
    });

    const setupFind = (overrides = {}) => {
        const fake = makeReservation(overrides);
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fake) });
        return fake;
    };

    it('updates a reservation and returns 200', async () => {
        setupFind();
        const updated = makeReservation();
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockResolvedValue(updated),
        });

        const req = baseReq();
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    it('returns 404 when reservation does not exist', async () => {
        Reservation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

        const req = baseReq();
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 401 when a non-owner non-admin tries to update', async () => {
        setupFind(); // owner is user123

        const req = baseReq({ user: { id: 'intruder', role: 'user' } });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('allows admin to update any reservation', async () => {
        setupFind();
        const updated = makeReservation();
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockResolvedValue(updated),
        });

        const req = baseReq({ user: { id: 'admin1', role: 'admin' } });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('uses existing restaurant from reservation when req.body.restaurant is absent', async () => {
        setupFind();
        const updated = makeReservation();
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockResolvedValue(updated),
        });

        const req = baseReq({ body: { startDateTime: '2025-01-01T10:00:00.000Z', endDateTime: '2025-01-01T12:00:00.000Z' } });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(Restaurant.findById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('looks up a new restaurant when req.body.restaurant is provided', async () => {
        setupFind();
        Restaurant.findById.mockResolvedValue(makeRestaurant());
        const updated = makeReservation();
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockResolvedValue(updated),
        });

        const req = baseReq({ body: { restaurant: validRestaurantId, startDateTime: '2025-01-01T10:00:00.000Z', endDateTime: '2025-01-01T12:00:00.000Z' } });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(Restaurant.findById).toHaveBeenCalledWith(validRestaurantId);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when req.body.restaurant is provided but not found and reservation has no fallback restaurant", async () => {
        // Reservation has no restaurant (null), so fallback `|| reservation.restaurant` is also null
        setupFind({ restaurant: null });
        // The lookup for the new restaurantId also returns null
        Restaurant.findById.mockResolvedValue(null);

        const req = baseReq({
            body: {
                restaurant: validRestaurantId,
                startDateTime: '2025-01-01T10:00:00.000Z',
                endDateTime: '2025-01-01T12:00:00.000Z',
            },
        });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining("doesn't exist"),
            })
        );
    });

    it('returns 400 when dates span different days', async () => {
        setupFind();

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T10:00:00.000Z',
                endDateTime: '2025-01-02T12:00:00.000Z',
            },
        });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('same day') })
        );
    });

    it('returns 400 when endTime is not after startTime', async () => {
        setupFind();

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T14:00:00.000Z',
                endDateTime: '2025-01-01T10:00:00.000Z',
            },
        });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('End Time') })
        );
    });

    it('returns 400 when time is outside restaurant open hours', async () => {
        setupFind({
            restaurant: { openTime: '09:00', closeTime: '11:00' },
        });

        const req = baseReq({
            body: {
                startDateTime: '2025-01-01T10:00:00.000Z',
                endDateTime: '2025-01-01T12:00:00.000Z', // closes at 11:00
            },
        });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Restarant time') })
        );
    });

    it('falls back to existing datetime fields when body omits them', async () => {
        setupFind(); // startDateTime: 2025-01-01T10:00Z, endDateTime: 2025-01-01T12:00Z
        const updated = makeReservation();
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockResolvedValue(updated),
        });

        // Body has no start/end — controller should use existing reservation datetimes
        const req = baseReq({ body: {} });
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 500 on database error', async () => {
        Reservation.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB crash')),
        });

        const req = baseReq();
        const res = mockRes();

        await controller.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot update Reservation' })
        );
    });
});

// ─── deleteReservation ────────────────────────────────────────────────────────

describe('deleteReservation', () => {
    afterEach(() => jest.clearAllMocks());

    const baseReq = (overrides = {}) => ({
        params: { id: validId },
        user: { id: 'user123', role: 'user' },
        ...overrides,
    });

    it('deletes a reservation and returns 200', async () => {
        const fake = makeReservation({ user: { toString: () => 'user123' } });
        Reservation.findById.mockResolvedValue(fake);

        const req = baseReq();
        const res = mockRes();

        await controller.deleteReservation(req, res);

        expect(fake.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('allows admin to delete any reservation', async () => {
        const fake = makeReservation({ user: { toString: () => 'someone-else' } });
        Reservation.findById.mockResolvedValue(fake);

        const req = baseReq({ user: { id: 'admin1', role: 'admin' } });
        const res = mockRes();

        await controller.deleteReservation(req, res);

        expect(fake.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when reservation does not exist', async () => {
        Reservation.findById.mockResolvedValue(null);

        const req = baseReq();
        const res = mockRes();

        await controller.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it('returns 401 when a non-owner non-admin tries to delete', async () => {
        const fake = makeReservation({ user: { toString: () => 'someone-else' } });
        Reservation.findById.mockResolvedValue(fake);

        const req = baseReq({ user: { id: 'intruder', role: 'user' } });
        const res = mockRes();

        await controller.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(fake.deleteOne).not.toHaveBeenCalled();
    });

    it('returns 500 on database error', async () => {
        Reservation.findById.mockRejectedValue(new Error('DB crash'));

        const req = baseReq();
        const res = mockRes();

        await controller.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot delete Reservation' })
        );
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// addReservation – typeof string guard false-branches (lines 97-103)
// ─────────────────────────────────────────────────────────────────────────────

/** A restaurant open around the clock (used by addReservation branch tests). */
const OPEN_RESTAURANT = { openTime: '00:00', closeTime: '23:59' };

const setupBaseMocks = () => {
    Restaurant.findById.mockResolvedValue(OPEN_RESTAURANT);
    Reservation.find.mockResolvedValue([]);
    Reservation.create.mockResolvedValue({
        _id: RESERVATION_ID,
        populate: jest.fn().mockResolvedValue(undefined),
    });
};

describe('addReservation – typeof string guard false-branches (lines 97-103)', () => {
    afterEach(() => jest.clearAllMocks());

    // FALSE branch of line 97: startDateTime is NOT a string
    it('skips startDateTime normalisation when startDateTime is a number (false branch, line 97)', async () => {
        Restaurant.findById.mockResolvedValue(OPEN_RESTAURANT);
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: 20250815100000, endDateTime: '2025-08-15T11:00:00.000Z' },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        // typeof check is false → block skipped → subsequent .slice() on number throws → 500
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });

    it('skips startDateTime normalisation when startDateTime is null (false branch, line 97)', async () => {
        Restaurant.findById.mockResolvedValue(OPEN_RESTAURANT);
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: null, endDateTime: '2025-08-15T11:00:00.000Z' },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });

    // FALSE branch of line 103: endDateTime is NOT a string (startDateTime IS a valid string)
    it('skips endDateTime normalisation when endDateTime is a number (false branch, line 103)', async () => {
        Restaurant.findById.mockResolvedValue(OPEN_RESTAURANT);
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: '2025-08-15T10:00:00.000Z', endDateTime: 20250815110000 },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        // Line 97 true branch taken; line 103 false branch taken → .slice() on number throws → 500
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });

    it('skips endDateTime normalisation when endDateTime is null (false branch, line 103)', async () => {
        Restaurant.findById.mockResolvedValue(OPEN_RESTAURANT);
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: '2025-08-15T10:00:00.000Z', endDateTime: null },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });

    // TRUE branch sanity checks — the replace() fires correctly
    it('normalises startDateTime when it is a malformed string (true branch, line 97)', async () => {
        setupBaseMocks();
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: '2025-08-15T10:00:00123Z', endDateTime: '2025-08-15T11:00:00.000Z' },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        expect(req.body.startDateTime).toBe('2025-08-15T10:00:00.123Z');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('normalises endDateTime when it is a malformed string (true branch, line 103)', async () => {
        setupBaseMocks();
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: '2025-08-15T10:00:00.000Z', endDateTime: '2025-08-15T11:00:00456Z' },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        expect(req.body.endDateTime).toBe('2025-08-15T11:00:00.456Z');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('leaves correctly-formatted strings unchanged (true branch, replace no-ops)', async () => {
        setupBaseMocks();
        const goodStart = '2025-08-15T10:00:00.000Z';
        const goodEnd   = '2025-08-15T11:00:00.000Z';
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: goodStart, endDateTime: goodEnd },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);
        expect(req.body.startDateTime).toBe(goodStart);
        expect(req.body.endDateTime).toBe(goodEnd);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});