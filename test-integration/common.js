const superagent = require('superagent');
const supertest = require('supertest');

let request = supertest(process.env.BASE_URL);

const getAccessToken = async () => {
  try {
    const rsp = await superagent.post('https://alexjpaz.auth0.com/oauth/token')
      .send({
        client_id: process.env.client_id,
        client_secret: process.env.client_secret,
        audience: "https://prestissimo.alexjpaz.com",
        grant_type: "client_credentials"
      });

    return rsp.body.access_token;
  } catch(e) {
    console.error("Failed to get access token", e.message);
    throw e;
  }
};

module.exports = {
  getAccessToken,
  request,
};