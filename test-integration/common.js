const config = require('config');
const { JWKS, JWT } = require('jose');
const fs = require('fs').promises;

const superagent = require('superagent');
const supertest = require('supertest');

let baseUrl = process.env.BASE_URL || "http://localhost:3000/local";

let request = supertest(baseUrl);

const aSecond = (t = 1000) => new Promise(r => setTimeout(r, t));

let accessToken = null;

const getAccessToken = async () => {
  if(accessToken) {
    return accessToken;
  }

  if(config && config.authorizer && config.authorizer.jwksUri.startsWith("file://")) {
    try {
      let path = config.authorizer.jwksUri.replace('file://','');
      const buffer = await fs.readFile(path);
      jwks = JSON.parse(buffer.toString());
      keyStore = JWKS.asKeyStore(jwks);
      let key = keyStore.all()[0];

      let token = JWT.sign(
        { scope: 'test' },
        key,
        {
          subject: "foo",
          audience: config.authorizer.audience,
          issuer: config.authorizer.issuer,
        }
      );

      return token;
    } catch(e) {
      throw e;
    }
    return
  }
  //
  try {
    const rsp = await superagent.post('https://alexjpaz.auth0.com/oauth/token')
      .send({
        client_id: process.env.client_id,
        client_secret: process.env.client_secret,
        audience: "https://prestissimo.alexjpaz.com",
        grant_type: "client_credentials"
      });

    let accessToken = rsp.body.access_token;

    return rsp.body.access_token;
  } catch(e) {
    console.error("Failed to get access token", e.message);
    throw e;
  }
};


module.exports = {
  baseUrl,
  getAccessToken,
  request,
  aSecond,
};

if(!process.env.BASE_URL) {
  const child_process = require('child_process');

  let proc;

  before(async () => {
    console.log('Starting serverless offline');
    process.env.NODE_ENV = 'test'; // seems bad :/
    proc = child_process.spawn('node_modules/.bin/serverless', ['offline'], {
      env: process.env
    });

    await new Promise((res, rej) => {
      console.log('Waiting for serverless offline');
      proc.stdout.on('data', (data) => {
        if(data.toString().includes('server ready')) {
          console.log('Ready');
          res();
        }
      });

      proc.stdout.on('data', (data) => {
        //process.stdout.write(data.toString());
      });

      proc.stderr.on('data', (data) => {
        //process.stderr.write(data.toString());
      });

      proc.on('close', rej);
    });
  });

  before(async () => {
    await request.get('/ping').expect(200);
  });

  after(async () => {
    if(proc) {
      proc.kill('SIGINT');
    }
  });
}

before(() => {
  console.info(`baseUrl=${baseUrl}`);
});
