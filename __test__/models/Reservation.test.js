const mongoose = require('mongoose');
const Reservation = require('../../models/Reservation');

describe('Reservation Model', () => {
  it('should require startDateTime and endDateTime', () => {
    const resv = new Reservation({});
    const err = resv.validateSync();
    expect(err.errors.startDateTime).toBeDefined();
    expect(err.errors.endDateTime).toBeDefined();
  });

  it('should validate successfully with valid ObjectIds', () => {
    const resv = new Reservation({
      startDateTime: new Date(),
      endDateTime: new Date(Date.now() + 3600000),
      user: new mongoose.Types.ObjectId(),
      restaurant: new mongoose.Types.ObjectId()
    });
    const err = resv.validateSync();
    expect(err).toBeUndefined();
  });
});