const mongoose = require('mongoose');
const Restaurant = require('../../models/Restaurant');

describe('Restaurant Model', () => {
  describe('Validation', () => {
    it('should fail if openTime is not in HH:mm format', () => {
      const rest = new Restaurant({ openTime: '9:00' }); // Missing leading zero
      const err = rest.validateSync();
      expect(err.errors.openTime).toBeDefined();
    });

    it('should fail if telephone is invalid', () => {
      const rest = new Restaurant({ telephone: '12345' });
      const err = rest.validateSync();
      expect(err.errors.telephone).toBeDefined();
    });

    it('should pass with valid Thai telephone (02 or 08/09)', () => {
      const rest = new Restaurant({
        name: 'Thai Bistro',
        address: '123 Street',
        imgsrc: 'img.jpg',
        telephone: '021234567', // Valid 02
        openTime: '09:00',
        closeTime: '22:00',
        user: new mongoose.Types.ObjectId()
      });
      const err = rest.validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe('Virtuals', () => {
    it('should have owner, reservations, and comments virtuals defined', () => {
      expect(Restaurant.schema.virtuals.owner).toBeDefined();
      expect(Restaurant.schema.virtuals.reservations).toBeDefined();
      expect(Restaurant.schema.virtuals.comments).toBeDefined();
    });

    it('should map owner virtual to User model', () => {
      const virtual = Restaurant.schema.virtuals.owner;
      expect(virtual.options.ref).toBe('User');
      expect(virtual.options.localField).toBe('user');
    });
  });
});