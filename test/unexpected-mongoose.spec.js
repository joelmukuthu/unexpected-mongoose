const mongoose = require('mongoose');
const expect = require('unexpected').use(require('../lib/unexpected-mongoose'));

describe('unexpected-mongoose', () => {
  let Cat;

  before(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test');
    await mongoose.connection.dropDatabase();
    Cat = mongoose.model('Cat', { name: String });
  });

  describe('ModelArray', () => {
    describe('to satisfy ModelArray', () => {
      let cats;

      before(async () => {
        cats = await Cat.insertMany([{ name: 'foo' }, { name: 'bar' }]);
      });

      it('loops infinitely', async () =>
        expect(cats, 'to satisfy', [
          new Cat({ name: 'foo' }),
          new Cat({ name: 'bar' })
        ]));
    });
  });
});
