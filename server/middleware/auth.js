const models = require('../models');
const Promise = require('bluebird');
const Session = require('../models/session');
const User = require('../models/user');

// write a createSession middleware function that
//accesses the parsed cookies on the request,
// looks up the user data related to that session, and
// assigns an object to a session property on the request that contains relevant user information. (Ask yourself: what information about the user would you want to keep in this session object?)

module.exports.createSession = (req, res, next) => {
  if ('cookies' in req && req.cookies['shortlyid']) {
    console.log(`found a cookie. cookie: ${req.cookies}`);
    Session.get({ 'hash': req.cookies['shortlyid'] })
      .then(session => {
        if (session && session.hash) {
          req.session = session;
          next();
        } else {
          delete req.cookies['shortlyid'];
          module.exports.createSession(req, res, next);
        }
      });
  } else {
    Session.create()
      .then(sessionDB => {
        Session.get({ 'id': sessionDB.insertId })
          .then(session => {
            req.session = session;
            res.cookie('shortlyid', session.hash);
            next();
          });
      });
  }

  // three cases: 1) no cookie; 2) cookie and we check and it's valid
  // 3) cookie and we check and it's not valid
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.verifySession = (req) => {
  console.log('req.session: ', req.session);
  if (req.session) {
    return req.session && req.session.userId !== null;
  }
};