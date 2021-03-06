const config = require('config');
const express = require('express');
const sinon = require('sinon');
const { expect } = require('chai');
const superagent = require('superagent');
const supertest = require('supertest');

const fs = require('fs').promises;

const { Transactions } = require('./transactions');

const AWS = require('../utils/aws');
const { TransactionService } = require('../utils/TransactionService');

const generateId = require('../utils/generateId');

describe('http/transactions', () => {
  let request;

  let mockS3;
  let transactionService;

  let userId = generateId();

  beforeEach(() => {
    mockS3 = new AWS.S3();
    transactionService = TransactionService.standard();

    let app = express();

    app.use('/api', (req, res, next) => {
      req.user = {
        userId,
      };
      next();
    });

    app.use('/api', Transactions({
      s3: mockS3,
      transactionService,
    }));

    request = supertest(app);
  });

  describe('transactions', () => {

    let createUserId;
    let transactionId;

    beforeEach(async () => {
      createUserId = userId;
      let item = await transactionService.create(createUserId);

      ({ transactionId } = item);
    });

    it('should list transactions', async () => {
      const rsp = await request.get('/api/transactions')
        .expect(200)
      ;

      expect(rsp.body.data[0].transactionId).to.eql(transactionId);
    });

    it('should fetch a transaction', async () => {
      const rsp = await request.get(`/api/transactions/${transactionId}`)
        .expect(200)
      ;

      expect(rsp.body.data.item.transactionId).to.eql(transactionId);
      expect(rsp.body.data.item.userId).to.eql(createUserId);
    });

    it('should create a transaction request', async () => {
      const rsp = await request.put(`/api/transactions`)
        .expect(200)
      ;

      expect(rsp.body.data.transactionId).to.be.a('String');
      expect(rsp.body.data.userId).to.be.eql(createUserId);
    });
  });

  describe('upload', () => {
    let createUserId;
    let transaction;

    beforeEach(async () => {
      createUserId = userId;
      transaction = await transactionService.create(createUserId);
    });

    it('should upload a file via PUT', async () => {
      let {
        url,
        httpMethod,
      } = transaction.upload;

      const buffer = Buffer.from("test");

      const req = await superagent.put(url)
        .send(buffer);

      const headRsp = await mockS3.headObject({
        Bucket: config.awsBucket,
        Key: transaction.upload.manifestKey,
      }).promise();

      expect(headRsp.ContentLength).not.to.eql(0);
      expect(headRsp.ContentLength).to.eql(buffer.length);
    });

  });
});
