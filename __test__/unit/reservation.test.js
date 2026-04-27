/**
 * Unit Tests – controllers/reservation.js
 *
 * Strategy: mock Reservation and Restaurant models entirely so no DB
 * connection is needed. Each describe block targets one exported function
 * and covers every branch that exists in the source.
 */

const reservationController = require('../../controllers/reservation');
const Reservation = require('../../models/Reservation');
const Restaurant = require('../../models/Restaurant');

jest.mock('../../models/Reservation');
jest.mock('../../models/Restaurant');

// ─── shared helpers ───────────────────────────────────────────────────────────

/** Build a chainable populate mock that ultimately resolves to `result`. */
const populateChain = (result) => {
    const chain = { populate: jest.fn() };
    chain.populate.mockResolvedValue(result);
    return chain;
};

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// ─── shared test data ─────────────────────────────────────────────────────────

const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_USER_ID = 'eeeeeeeeeeeeeeeeeeeeeeee';
const ADMIN_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccccccccccccccccccc';
const RESERVATION_ID = 'dddddddddddddddddddddddd';

/** A restaurant open 09:00–21:00. */
const RESTAURANT = { openTime: '09:00', closeTime: '21:00' };

/**
 * Build a minimal existing-reservation object whose user._id matches userId.
 * Falls back to stored ISO strings when no new times are provided (mirrors
 * the updateReservation fallback logic).
 */
const makeExistingReservation = (userId = USER_ID) => ({
    user: { _id: { toString: () => userId } },
    restaurant: RESTAURANT,
    startDateTime: { toISOString: () => '2025-06-15T10:00:00.000Z' },
    endDateTime: { toISOString: () => '2025-06-15T12:00:00.000Z' },
});

// ─────────────────────────────────────────────────────────────────────────────
// getReservations
// ─────────────────────────────────────────────────────────────────────────────

describe('getReservations', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns only the current user reservations when role is "user" and no restaurantId', async () => {
        const data = [{ _id: '1' }, { _id: '2' }];
        Reservation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(data) });

        const req = { user: { id: USER_ID, role: 'user' }, params: {} };
        const res = mockRes();
        await reservationController.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({ user: USER_ID });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, count: 2, data })
        );
    });

    it('returns user reservations filtered by restaurantId when role is "user"', async () => {
        const data = [{ _id: '3' }];
        Reservation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(data) });

        const req = { user: { id: USER_ID, role: 'user' }, params: { restaurantId: RESTAURANT_ID } };
        const res = mockRes();
        await reservationController.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({ user: USER_ID, restaurant: RESTAURANT_ID });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    });

    it('returns ALL reservations when role is "admin" and no restaurantId', async () => {
        const data = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
        Reservation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(data) });

        const req = { user: { id: ADMIN_ID, role: 'admin' }, params: {} };
        const res = mockRes();
        await reservationController.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
    });

    it('filters by restaurantId only (no user filter) when role is "admin"', async () => {
        const data = [{ _id: '5' }];
        Reservation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(data) });

        const req = { user: { id: ADMIN_ID, role: 'admin' }, params: { restaurantId: RESTAURANT_ID } };
        const res = mockRes();
        await reservationController.getReservations(req, res);

        expect(Reservation.find).toHaveBeenCalledWith({ restaurant: RESTAURANT_ID });
    });

    it('returns 500 with error message when the database query rejects', async () => {
        Reservation.find.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB down')),
        });

        const req = { user: { id: USER_ID, role: 'user' }, params: {} };
        const res = mockRes();
        await reservationController.getReservations(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot find Reservation' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getReservation
// ─────────────────────────────────────────────────────────────────────────────

describe('getReservation', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns 404 when no reservation exists with that id', async () => {
        Reservation.findById.mockReturnValue(populateChain(null));

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(RESERVATION_ID),
            })
        );
    });

    it('returns 401 when a non-admin user requests someone else reservation', async () => {
        const reservation = { user: { _id: { toString: () => OTHER_USER_ID } } };
        Reservation.findById.mockReturnValue(populateChain(reservation));

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(USER_ID),
            })
        );
    });

    it('returns 200 with the reservation when the owner requests it', async () => {
        const reservation = { user: { _id: { toString: () => USER_ID } } };
        Reservation.findById.mockReturnValue(populateChain(reservation));

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: reservation })
        );
    });

    it('returns 200 when an admin requests another user reservation', async () => {
        const reservation = { user: { _id: { toString: () => OTHER_USER_ID } } };
        Reservation.findById.mockReturnValue(populateChain(reservation));

        const req = { user: { id: ADMIN_ID, role: 'admin' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 when findById throws an unexpected error', async () => {
        Reservation.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('Unexpected')),
        });

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.getReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot find Reservation' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// addReservation
// ─────────────────────────────────────────────────────────────────────────────

describe('addReservation', () => {
    afterEach(() => jest.clearAllMocks());

    /** Convenience builder for add-reservation requests. */
    const makeReq = ({
        role = 'user',
        userId = USER_ID,
        start = '2025-06-15T10:00:00.000Z',
        end = '2025-06-15T12:00:00.000Z',
        extra = {},
    } = {}) => ({
        user: { id: userId, role },
        params: { restaurantId: RESTAURANT_ID },
        body: { startDateTime: start, endDateTime: end, ...extra },
    });

    it('returns 404 when the restaurant does not exist', async () => {
        Restaurant.findById.mockResolvedValue(null);

        const req = makeReq();
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(RESTAURANT_ID),
            })
        );
    });

    it('returns 400 when start date and end date are on different days', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);

        const req = makeReq({ start: '2025-06-15T10:00:00.000Z', end: '2025-06-16T12:00:00.000Z' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('same day') })
        );
    });

    it('returns 400 when startTime equals endTime (boundary: not strictly less than)', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);

        const req = makeReq({ start: '2025-06-15T10:00:00.000Z', end: '2025-06-15T10:00:00.000Z' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('End Time') })
        );
    });

    it('returns 400 when endTime is before startTime', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);

        const req = makeReq({ start: '2025-06-15T14:00:00.000Z', end: '2025-06-15T10:00:00.000Z' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('End Time') })
        );
    });

    it('returns 400 when startTime is before restaurant openTime', async () => {
        Restaurant.findById.mockResolvedValue({ openTime: '11:00', closeTime: '21:00' });

        // 08:00–10:00 is before opening at 11:00
        const req = makeReq({ start: '2025-06-15T08:00:00.000Z', end: '2025-06-15T10:00:00.000Z' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('08:00') })
        );
    });

    it('returns 400 when endTime exceeds restaurant closeTime', async () => {
        Restaurant.findById.mockResolvedValue({ openTime: '09:00', closeTime: '20:00' });

        // ends at 21:00 but restaurant closes at 20:00
        const req = makeReq({ start: '2025-06-15T10:00:00.000Z', end: '2025-06-15T21:00:00.000Z' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('21:00') })
        );
    });

    it('returns 400 when a regular user already has 3 reservations (at limit)', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([{}, {}, {}]); // exactly 3

        const req = makeReq();
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('3 reservations') })
        );
    });

    it('creates and returns the reservation when user has 0 existing reservations', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([]);

        const saved = { _id: RESERVATION_ID };
        Reservation.create.mockResolvedValue({
            ...saved,
            populate: jest.fn().mockResolvedValue(undefined),
        });

        const req = makeReq();
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(Reservation.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('creates reservation when user is exactly at 2 (one below limit)', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([{}, {}]); // 2 — still allowed

        Reservation.create.mockResolvedValue({
            _id: RESERVATION_ID,
            populate: jest.fn().mockResolvedValue(undefined),
        });

        const req = makeReq();
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows an admin to create a reservation even when they already have 3+', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([{}, {}, {}, {}]); // 4 existing

        Reservation.create.mockResolvedValue({
            _id: RESERVATION_ID,
            populate: jest.fn().mockResolvedValue(undefined),
        });

        const req = makeReq({ userId: ADMIN_ID, role: 'admin' });
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('normalises XSS-sanitiser-mangled ISO strings (missing millisecond dot) before processing', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([]);
        Reservation.create.mockResolvedValue({
            _id: RESERVATION_ID,
            populate: jest.fn().mockResolvedValue(undefined),
        });

        const req = {
            user: { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body: {
                // digits without dot before milliseconds — the regex in the controller fixes this
                startDateTime: '2025-06-15T10:00:00000Z',
                endDateTime: '2025-06-15T12:00:00000Z',
            },
        };
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(Reservation.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 500 when Reservation.create throws unexpectedly', async () => {
        Restaurant.findById.mockResolvedValue(RESTAURANT);
        Reservation.find.mockResolvedValue([]);
        Reservation.create.mockRejectedValue(new Error('Write failed'));

        const req = makeReq();
        const res = mockRes();
        await reservationController.addReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot create Reservation' })
        );
    });

    // ── Lines 97-103: ISO string normalisation (XSS sanitiser removes the dot) ──

    /**
     * Helper: wire up the three mocks needed to reach Reservation.create.
     *   1. Restaurant.findById  → open restaurant (00:00-23:59 avoids time validation)
     *   2. Reservation.find     → empty array   (controller awaits directly, no chain)
     *   3. Reservation.create   → stub with .populate()
     */
    const setupNormalisationMocks = () => {
        Restaurant.findById.mockResolvedValue({ openTime: '00:00', closeTime: '23:59' });
        Reservation.find.mockResolvedValue([]);
        Reservation.create.mockResolvedValue({
            _id: RESERVATION_ID,
            populate: jest.fn().mockResolvedValue(undefined),
        });
    };

    it('inserts a dot before milliseconds in BOTH fields when both strings match the regex (lines 97-103)', async () => {
        setupNormalisationMocks();

        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body: {
                startDateTime: '2025-08-15T10:00:00123Z', // missing dot
                endDateTime:   '2025-08-15T11:00:00456Z', // missing dot
            },
        };
        const res = mockRes();

        await reservationController.addReservation(req, res);

        // Controller mutates req.body in-place
        expect(req.body.startDateTime).toBe('2025-08-15T10:00:00.123Z');
        expect(req.body.endDateTime).toBe('2025-08-15T11:00:00.456Z');

        // Corrected strings are forwarded to Reservation.create
        expect(Reservation.create).toHaveBeenCalledWith(
            expect.objectContaining({
                startDateTime: '2025-08-15T10:00:00.123Z',
                endDateTime:   '2025-08-15T11:00:00.456Z',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('leaves BOTH fields unchanged when they already contain a millisecond dot (lines 97-103)', async () => {
        setupNormalisationMocks();

        const goodStart = '2025-08-15T10:00:00.000Z';
        const goodEnd   = '2025-08-15T11:00:00.000Z';
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body:   { startDateTime: goodStart, endDateTime: goodEnd },
        };
        const res = mockRes();

        await reservationController.addReservation(req, res);

        // Regex should not match – strings must be untouched
        expect(req.body.startDateTime).toBe(goodStart);
        expect(req.body.endDateTime).toBe(goodEnd);

        expect(Reservation.create).toHaveBeenCalledWith(
            expect.objectContaining({ startDateTime: goodStart, endDateTime: goodEnd })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('fixes only startDateTime when only it is missing the dot (lines 97-103)', async () => {
        setupNormalisationMocks();

        const goodEnd = '2025-08-15T11:00:00.000Z';
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body: {
                startDateTime: '2025-08-15T10:00:00789Z', // missing dot
                endDateTime:   goodEnd,                    // already correct
            },
        };
        const res = mockRes();

        await reservationController.addReservation(req, res);

        expect(req.body.startDateTime).toBe('2025-08-15T10:00:00.789Z');
        expect(req.body.endDateTime).toBe(goodEnd); // untouched

        expect(Reservation.create).toHaveBeenCalledWith(
            expect.objectContaining({
                startDateTime: '2025-08-15T10:00:00.789Z',
                endDateTime:   goodEnd,
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('fixes only endDateTime when only it is missing the dot (lines 97-103)', async () => {
        setupNormalisationMocks();

        const goodStart = '2025-08-15T10:00:00.000Z';
        const req = {
            user:   { id: USER_ID, role: 'user' },
            params: { restaurantId: RESTAURANT_ID },
            body: {
                startDateTime: goodStart,                  // already correct
                endDateTime:   '2025-08-15T11:00:00321Z', // missing dot
            },
        };
        const res = mockRes();

        await reservationController.addReservation(req, res);

        expect(req.body.startDateTime).toBe(goodStart); // untouched
        expect(req.body.endDateTime).toBe('2025-08-15T11:00:00.321Z');

        expect(Reservation.create).toHaveBeenCalledWith(
            expect.objectContaining({
                startDateTime: goodStart,
                endDateTime:   '2025-08-15T11:00:00.321Z',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateReservation
// ─────────────────────────────────────────────────────────────────────────────

describe('updateReservation', () => {
    afterEach(() => jest.clearAllMocks());

    /** Quick builder for update requests. */
    const makeReq = ({
        userId = USER_ID,
        role = 'user',
        body = {},
    } = {}) => ({
        user: { id: userId, role },
        params: { id: RESERVATION_ID },
        body,
    });

    it('returns 404 when the reservation does not exist', async () => {
        Reservation.findById.mockReturnValue(populateChain(null));

        const req = makeReq();
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(RESERVATION_ID),
            })
        );
    });

    it('returns 401 when a non-admin user tries to update someone else reservation', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation(OTHER_USER_ID)));

        const req = makeReq({ body: {} });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(USER_ID),
            })
        );
    });

    it('returns 400 when a new restaurantId is provided but that restaurant does not exist', async () => {
        const badReservation = { ...makeExistingReservation(), restaurant: null };
        Reservation.findById.mockReturnValue(populateChain(badReservation));
        Restaurant.findById.mockResolvedValue(null);

        const req = makeReq({ body: { restaurant: 'nonexistent-id' } });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("doesn't exist") })
        );
    });

    it('returns 400 when updated start and end dates span across two different days', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T10:00:00.000Z',
                endDateTime: '2025-06-16T12:00:00.000Z', // next day
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('same day') })
        );
    });

    it('returns 400 when updated startTime equals endTime', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T10:00:00.000Z',
                endDateTime: '2025-06-15T10:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('End Time') })
        );
    });

    it('returns 400 when updated endTime is before startTime', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T15:00:00.000Z',
                endDateTime: '2025-06-15T10:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when updated startTime is outside restaurant opening hours', async () => {
        Reservation.findById.mockReturnValue(
            populateChain({
                ...makeExistingReservation(),
                restaurant: { openTime: '11:00', closeTime: '20:00' },
            })
        );

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T08:00:00.000Z', // before openTime
                endDateTime: '2025-06-15T12:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when updated endTime exceeds restaurant closeTime', async () => {
        Reservation.findById.mockReturnValue(
            populateChain({
                ...makeExistingReservation(),
                restaurant: { openTime: '09:00', closeTime: '20:00' },
            })
        );

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T10:00:00.000Z',
                endDateTime: '2025-06-15T21:00:00.000Z', // after closeTime
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates successfully using new times provided in body', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const updated = { _id: RESERVATION_ID, startDateTime: '2025-06-15T13:00:00.000Z' };
        Reservation.findByIdAndUpdate.mockReturnValue(populateChain(updated));

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T13:00:00.000Z',
                endDateTime: '2025-06-15T15:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(Reservation.findByIdAndUpdate).toHaveBeenCalledWith(
            RESERVATION_ID,
            expect.any(Object),
            { new: true, runValidators: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: updated })
        );
    });

    it('updates successfully falling back to stored times when body provides neither startDateTime nor endDateTime', async () => {
        // Stored: 10:00–12:00 on 2025-06-15 — both within RESTAURANT hours
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const updated = { _id: RESERVATION_ID };
        Reservation.findByIdAndUpdate.mockReturnValue(populateChain(updated));

        const req = makeReq({ body: { notes: 'just changing notes' } });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows an admin to update another user reservation', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation(OTHER_USER_ID)));

        const updated = { _id: RESERVATION_ID };
        Reservation.findByIdAndUpdate.mockReturnValue(populateChain(updated));

        const req = makeReq({
            userId: ADMIN_ID,
            role: 'admin',
            body: {
                startDateTime: '2025-06-15T10:00:00.000Z',
                endDateTime: '2025-06-15T12:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('uses the new restaurant hours when a new restaurantId is provided in body', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));

        const NEW_RESTAURANT_ID = 'ffffffffffffffffffffffff';
        // New restaurant is open 14:00–22:00
        Restaurant.findById.mockResolvedValue({ openTime: '14:00', closeTime: '22:00' });

        const updated = { _id: RESERVATION_ID };
        Reservation.findByIdAndUpdate.mockReturnValue(populateChain(updated));

        const req = makeReq({
            body: {
                restaurant: NEW_RESTAURANT_ID,
                startDateTime: '2025-06-15T15:00:00.000Z',
                endDateTime: '2025-06-15T17:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(Restaurant.findById).toHaveBeenCalledWith(NEW_RESTAURANT_ID);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 500 when findByIdAndUpdate throws unexpectedly', async () => {
        Reservation.findById.mockReturnValue(populateChain(makeExistingReservation()));
        Reservation.findByIdAndUpdate.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('Write failed')),
        });

        const req = makeReq({
            body: {
                startDateTime: '2025-06-15T10:00:00.000Z',
                endDateTime: '2025-06-15T12:00:00.000Z',
            },
        });
        const res = mockRes();
        await reservationController.updateReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot update Reservation' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteReservation
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteReservation', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns 404 when the reservation does not exist', async () => {
        Reservation.findById.mockResolvedValue(null);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(RESERVATION_ID),
            })
        );
    });

    it('returns 401 when a non-admin user tries to delete someone else reservation', async () => {
        const reservation = { user: { toString: () => OTHER_USER_ID } };
        Reservation.findById.mockResolvedValue(reservation);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining(USER_ID),
            })
        );
    });

    it('deletes the reservation and returns 200 when the owner requests deletion', async () => {
        const reservation = {
            user: { toString: () => USER_ID },
            deleteOne: jest.fn().mockResolvedValue({}),
        };
        Reservation.findById.mockResolvedValue(reservation);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(reservation.deleteOne).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: {} })
        );
    });

    it('allows an admin to delete any reservation regardless of ownership', async () => {
        const reservation = {
            user: { toString: () => OTHER_USER_ID },
            deleteOne: jest.fn().mockResolvedValue({}),
        };
        Reservation.findById.mockResolvedValue(reservation);

        const req = { user: { id: ADMIN_ID, role: 'admin' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(reservation.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 500 when findById throws an unexpected error', async () => {
        Reservation.findById.mockRejectedValue(new Error('DB crash'));

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot delete Reservation' })
        );
    });

    it('returns 500 when deleteOne itself throws after reservation is found', async () => {
        const reservation = {
            user: { toString: () => USER_ID },
            deleteOne: jest.fn().mockRejectedValue(new Error('Delete failed')),
        };
        Reservation.findById.mockResolvedValue(reservation);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: RESERVATION_ID } };
        const res = mockRes();
        await reservationController.deleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot delete Reservation' })
        );
    });
});