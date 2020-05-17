const supertest = require('supertest');

const {
  request,
  getAccessToken,
} = require('./common');

describe('auth', () => {
  let token;

  beforeEach(async () => {
    token = await getAccessToken();
  });

  describe('unauthorized', () => {
    it('should allow some pages to pass through', async () => {
      await request.get('/index.html')
        .expect(200)
      ;
    });

    it('should bounce when no credentials are provided', async () => {
      await request.get('/test-secure.html')
        .expect(401)
      ;
    });
  });

  describe('authorized', () => {
    it('index', async () => {
      await request.get('/index.html')
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      ;
    });

    it('index', async () => {
      await request.get('/test-secure.html')
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      ;
    });

  });
});
