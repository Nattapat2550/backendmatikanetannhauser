const authController = require('../../controllers/auth');
const User = require('../../models/User');

jest.mock('../../models/User');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (body = {}, user = null) => ({ body, user });

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return 400 when email or password is missing', async () => {
        const req = mockReq({ email: 'test@test.com' }); // no password
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ sucess: false })
        );
    });

    it('should return 400 when user is not found', async () => {
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        const req = mockReq({ email: 'nope@test.com', password: 'pass' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ sucess: false, msg: 'Invalid Credentials' })
        );
    });

    it('should return 401 when password does not match', async () => {
        const fakeUser = { matchPassword: jest.fn().mockResolvedValue(false) };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        const req = mockReq({ email: 'u@test.com', password: 'wrong' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should send token response on successful login', async () => {
        const fakeUser = {
            matchPassword: jest.fn().mockResolvedValue(true),
            getSignedJwtToken: jest.fn().mockReturnValue('fake-token'),
            id: 'user123',
        };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        process.env.JWT_COOKIE_EXPIRE = '30';

        const req = mockReq({ email: 'u@test.com', password: 'correct' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.cookie).toHaveBeenCalledWith('token', 'fake-token', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, token: 'fake-token' })
        );
    });

    it('should set secure cookie flag when NODE_ENV is production', async () => {
        const fakeUser = {
            matchPassword: jest.fn().mockResolvedValue(true),
            getSignedJwtToken: jest.fn().mockReturnValue('fake-token'),
            id: 'user123',
        };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        process.env.JWT_COOKIE_EXPIRE = '30';
        process.env.NODE_ENV = 'production';

        const req = mockReq({ email: 'u@test.com', password: 'correct' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.cookie).toHaveBeenCalledWith(
            'token',
            'fake-token',
            expect.objectContaining({ secure: true })
        );

        process.env.NODE_ENV = 'test';
    });

    it('should return 401 when an exception is thrown', async () => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockRejectedValue(new Error('DB error')),
        });
        const req = mockReq({ email: 'u@test.com', password: 'pass' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it('should set secure:true on the cookie when NODE_ENV is production', async () => {
        const fakeUser = {
            matchPassword: jest.fn().mockResolvedValue(true),
            getSignedJwtToken: jest.fn().mockReturnValue('secure-token'),
            id: 'user123',
        };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        process.env.JWT_COOKIE_EXPIRE = '30';
        process.env.NODE_ENV = 'production';

        const req = mockReq({ email: 'u@test.com', password: 'correct' });
        const res = mockRes();

        await authController.login(req, res);

        expect(res.cookie).toHaveBeenCalledWith(
            'token',
            'secure-token',
            expect.objectContaining({ secure: true })
        );

        delete process.env.NODE_ENV;
    });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return 400 if email already exists', async () => {
        User.findOne
            .mockResolvedValueOnce({ email: 'exists@test.com' }) // email check
            .mockResolvedValueOnce(null);                        // telephone check (unused)

        const req = mockReq({ name: 'A', email: 'exists@test.com', password: 'pass', telephone: '0812345678' });
        const res = mockRes();

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'This email is already existed' })
        );
    });

    it('should return 400 if telephone already exists', async () => {
        User.findOne
            .mockResolvedValueOnce(null)                          // email check
            .mockResolvedValueOnce({ telephone: '0812345678' });  // telephone check

        const req = mockReq({ name: 'A', email: 'new@test.com', password: 'pass', telephone: '0812345678' });
        const res = mockRes();

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'This telephone number is already existed' })
        );
    });

    it('should create user and respond with token on success', async () => {
        User.findOne.mockResolvedValue(null);
        const fakeUser = {
            getSignedJwtToken: jest.fn().mockReturnValue('reg-token'),
            id: 'new-user-id',
        };
        User.create.mockResolvedValue(fakeUser);
        process.env.JWT_COOKIE_EXPIRE = '30';

        const req = mockReq({ name: 'Bob', email: 'bob@test.com', password: 'secret', telephone: '0812345678' });
        const res = mockRes();

        await authController.register(req, res);

        expect(User.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'bob@test.com' })
        );
        expect(res.cookie).toHaveBeenCalledWith('token', 'reg-token', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, token: 'reg-token' })
        );
    });

    it('should return 400 when User.create throws', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockRejectedValue(new Error('Create failed'));

        const req = mockReq({ name: 'X', email: 'x@test.com', password: 'pass', telephone: '0812345678' });
        const res = mockRes();

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('getMe', () => {
    it('should return the authenticated user', async () => {
        const fakeUser = { id: 'uid', name: 'Alice' };
        User.findById.mockResolvedValue(fakeUser);

        const req = mockReq({}, { id: 'uid' });
        const res = mockRes();

        await authController.getMe(req, res);

        expect(User.findById).toHaveBeenCalledWith('uid');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: fakeUser })
        );
    });
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('getAll', () => {
    it('should return all users', async () => {
        const users = [{ name: 'A' }, { name: 'B' }];
        User.find.mockResolvedValue(users);

        const req = mockReq();
        const res = mockRes();

        await authController.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: users })
        );
    });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout', () => {
    it('should clear the token cookie and return success', async () => {
        const req = mockReq();
        const res = mockRes();

        await authController.logout(req, res);

        expect(res.cookie).toHaveBeenCalledWith('token', 'none', expect.any(Object));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});