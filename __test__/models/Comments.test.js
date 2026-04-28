const mongoose = require('mongoose');
const Comment = require('../../models/Comment');

describe('Comment Model', () => {
  it('should validate successfully with valid data', () => {
    const comment = new Comment({
      text: 'Great food!',
      rating: 5,
      restaurant: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId()
    });
    const err = comment.validateSync();
    expect(err).toBeUndefined();
  });

  it('should fail if rating is greater than 5', () => {
    const comment = new Comment({ rating: 6 });
    const err = comment.validateSync();
    expect(err.errors.rating).toBeDefined();
  });

  it('should fail if text exceeds 500 characters', () => {
    const longText = 'a'.repeat(501);
    const comment = new Comment({ text: longText });
    const err = comment.validateSync();
    expect(err.errors.text).toBeDefined();
  });

  it('should default isEdited to false', () => {
    const comment = new Comment({ text: 'Test' });
    expect(comment.isEdited).toBe(false);
  });
});