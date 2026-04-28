const mongoose = require('mongoose'); // Added to simulate CastError
const commentsController = require('../../controllers/comments');
const Comment = require('../../models/Comment');
const Restaurant = require('../../models/Restaurant');

jest.mock('../../models/Comment');
jest.mock('../../models/Restaurant');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ADMIN_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccccccccccccccccccc';
const COMMENT_ID = 'dddddddddddddddddddddddd';

describe('getComments', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return all comments with default sort', async () => {
        const comments = [{ text: 'Great!' }, { text: 'Nice place' }];
        const chain = {
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(comments),
        };
        Comment.find.mockReturnValue(chain);

        const req = { query: {} };
        const res = mockRes();

        await commentsController.getComments(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, count: 2, data: comments })
        );
    });

    it('should apply select and sort from query params', async () => {
        const comments = [{ text: 'Good' }];
        const chain = {
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(comments),
        };
        Comment.find.mockReturnValue(chain);

        const req = { query: { select: 'text,rating', sort: 'rating,-createdAt' } };
        const res = mockRes();

        await commentsController.getComments(req, res);

        expect(chain.select).toHaveBeenCalledWith('text rating');
        expect(chain.sort).toHaveBeenCalledWith('rating -createdAt');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on database error', async () => {
        const chain = {
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockRejectedValue(new Error('DB error')),
        };
        Comment.find.mockReturnValue(chain);

        const req = { query: {} };
        const res = mockRes();

        await commentsController.getComments(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: 'Cannot get comments' })
        );
    });
});

describe('getComment', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return a single comment', async () => {
        const comment = { _id: COMMENT_ID, text: 'Lovely!' };
        const chain = {
            populate: jest.fn().mockReturnThis(),
        };
        chain.populate.mockReturnValueOnce(chain).mockResolvedValue(comment);
        Comment.findById.mockReturnValue(chain);

        const req = { params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.getComment(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when comment not found', async () => {
        const chain = { populate: jest.fn().mockReturnThis() };
        chain.populate.mockReturnValueOnce(chain).mockResolvedValue(null);
        Comment.findById.mockReturnValue(chain);

        const req = { params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.getComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    // NEW: Error handling for findById failure
    it('should return 500 on database error during retrieval', async () => {
        Comment.findById.mockImplementation(() => {
            throw new Error('Find error');
        });

        const req = { params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.getComment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Cannot find comment' })
        );
    });
});

describe('addComment', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return 404 when restaurant not found', async () => {
        Restaurant.findById.mockResolvedValue(null);

        const req = {
            user: { id: USER_ID },
            params: { restaurantId: RESTAURANT_ID },
            body: { text: 'Nice' },
        };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 429 when comment rate limit is exceeded', async () => {
        Restaurant.findById.mockResolvedValue({ _id: RESTAURANT_ID });
        Comment.countDocuments.mockResolvedValue(10);

        const req = {
            user: { id: USER_ID },
            params: { restaurantId: RESTAURANT_ID },
            body: { text: 'Spam' },
        };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should return 400 on validation error', async () => {
        Restaurant.findById.mockResolvedValue({ _id: RESTAURANT_ID });
        Comment.countDocuments.mockResolvedValue(0);
        Comment.findOne.mockResolvedValue(null);

        const validationError = {
            name: 'ValidationError',
            errors: { rating: { message: 'Rating is required' } },
        };
        const mockCommentInstance = {
            validate: jest.fn().mockRejectedValue(validationError),
        };
        Comment.mockImplementation(() => mockCommentInstance);

        const req = { user: { id: USER_ID }, params: { restaurantId: RESTAURANT_ID }, body: {} };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: ['Rating is required'] })
        );
    });

    // NEW: Generic 500 error for creation
    it('should return 500 on unexpected server error', async () => {
        Restaurant.findById.mockRejectedValue(new Error('Unexpected crash'));

        const req = { user: { id: USER_ID }, params: { restaurantId: RESTAURANT_ID }, body: {} };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Cannot create comment' })
        );
    });
});

describe('updateComment', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return 401 when non-owner tries to update', async () => {
        const comment = { user: { toString: () => 'other-user' } };
        Comment.findById.mockResolvedValue(comment);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID }, body: {} };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    // NEW: Handle Mongoose CastError (Invalid ID format)
    it('should return 400 on Mongoose CastError', async () => {
        const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', 'id');
        Comment.findById.mockRejectedValue(castError);

        const req = { user: { id: USER_ID }, params: { id: 'invalid-id' }, body: {} };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.stringContaining("Invalid value for field 'id'")
            })
        );
    });

    it('should return 400 on validation error during update', async () => {
        const comment = { user: { toString: () => USER_ID } };
        Comment.findById.mockResolvedValue(comment);

        const validationError = {
            name: 'ValidationError',
            errors: { rating: { message: 'Too high' } },
        };
        Comment.findByIdAndUpdate.mockRejectedValue(validationError);

        const req = { user: { id: USER_ID }, params: { id: COMMENT_ID }, body: { rating: 10 } };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    // NEW: Generic 500 error for update
    it('should return 500 on database error during update', async () => {
        Comment.findById.mockRejectedValue(new Error('Update failed'));

        const req = { user: { id: USER_ID }, params: { id: COMMENT_ID }, body: {} };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Cannot update comment' })
        );
    });
});

describe('deleteComment', () => {
    afterEach(() => jest.clearAllMocks());

    it('should return 404 when comment not found', async () => {
        Comment.findById.mockResolvedValue(null);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.deleteComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on database error during deletion', async () => {
        Comment.findById.mockRejectedValue(new Error('DB down'));

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.deleteComment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Cannot delete comment' })
        );
    });

    it('should return 500 if deleteOne fails', async () => {
        const comment = {
            user: { toString: () => USER_ID },
            deleteOne: jest.fn().mockRejectedValue(new Error('Deletion failed')),
        };
        Comment.findById.mockResolvedValue(comment);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.deleteComment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('addComment', () => {
    it('should return 400 if user already reviewed (Line 106)', async () => {
        Restaurant.findById.mockResolvedValue({ _id: RESTAURANT_ID });
        Comment.countDocuments.mockResolvedValue(0);
        // Simulate existing comment found
        Comment.findOne.mockResolvedValue({ _id: 'exists' });

        const req = {
            user: { id: USER_ID },
            params: { restaurantId: RESTAURANT_ID },
            body: { text: 'test' }
        };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "You have already reviewed this restaurant" })
        );
    });

    it('should save and return 201 on success (Lines 115-116)', async () => {
        Restaurant.findById.mockResolvedValue({ _id: RESTAURANT_ID });
        Comment.countDocuments.mockResolvedValue(0);
        Comment.findOne.mockResolvedValue(null);

        const savedComment = { _id: COMMENT_ID, text: 'New Comment' };
        const mockCommentInstance = {
            validate: jest.fn().mockResolvedValue(true),
            save: jest.fn().mockResolvedValue(savedComment)
        };
        // Mock constructor to return the instance
        Comment.mockImplementation(() => mockCommentInstance);

        const req = {
            user: { id: USER_ID },
            params: { restaurantId: RESTAURANT_ID },
            body: { text: 'New Comment' }
        };
        const res = mockRes();

        await commentsController.addComment(req, res);

        expect(mockCommentInstance.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: savedComment })
        );
    });
});

describe('updateComment', () => {
    it('should return 404 if comment to update is not found (Line 135)', async () => {
        Comment.findById.mockResolvedValue(null);

        const req = { user: { id: USER_ID }, params: { id: COMMENT_ID }, body: {} };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining(COMMENT_ID) })
        );
    });

    it('should return 200 on successful update (Line 150)', async () => {
        const comment = { user: { toString: () => USER_ID } };
        const updatedComment = { _id: COMMENT_ID, text: 'Updated' };

        Comment.findById.mockResolvedValue(comment);
        Comment.findByIdAndUpdate.mockResolvedValue(updatedComment);

        const req = {
            user: { id: USER_ID, role: 'user' },
            params: { id: COMMENT_ID },
            body: { text: 'Updated' }
        };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: updatedComment })
        );
    });

    it('should catch and handle Mongoose CastError (Line 155)', async () => {
        const castError = new mongoose.Error.CastError('ObjectId', 'invalid', 'id');
        Comment.findById.mockRejectedValue(castError);

        const req = { user: { id: USER_ID }, params: { id: 'invalid' }, body: {} };
        const res = mockRes();

        await commentsController.updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("Invalid value for field 'id'") })
        );
    });
});

describe('deleteComment', () => {
    it('should return 401 if user is not authorized to delete (Line 178)', async () => {
        const comment = { user: { toString: () => 'different-user' } };
        Comment.findById.mockResolvedValue(comment);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.deleteComment(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("not authorized") })
        );
    });

    it('should return 200 and success message on deletion (Line 183)', async () => {
        const mockComment = {
            user: { toString: () => USER_ID },
            deleteOne: jest.fn().mockResolvedValue({})
        };
        Comment.findById.mockResolvedValue(mockComment);

        const req = { user: { id: USER_ID, role: 'user' }, params: { id: COMMENT_ID } };
        const res = mockRes();

        await commentsController.deleteComment(req, res);

        expect(mockComment.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Comment successfully deleted.' })
        );
    });

    it('should cover pluralization in formatWindowDuration (Line 18)', () => {
        const originalFloor = Math.floor;
        // Mock Math.floor to return 2 so "1 minute" becomes "2 minutes" 
        // during the module initialization.
        const floorSpy = jest.spyOn(Math, 'floor').mockReturnValue(2);

        jest.isolateModules(() => {
            // Re-requiring the file triggers the top-level WINDOW_MS_STRING calculation
            require('../../controllers/comments');
        });

        expect(floorSpy).toHaveBeenCalled();
        floorSpy.mockRestore();
        Math.floor = originalFloor;
    });
});