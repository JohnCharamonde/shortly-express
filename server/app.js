const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const ParseCookies = require('./middleware/cookieParser');
const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(ParseCookies);
app.use(Auth.createSession);

app.get('/',
  (req, res) => {
    console.log('Getting root');
    if (Auth.verifySession(req)) {
      console.log('verify passed, getting index');
      res.render('index');
    } else {
      console.log('verify failed, heading to login');
      res.render('login');
    }
  });

app.get('/create',
  (req, res) => {
    if (Auth.verifySession(req, res)) {
      res.render('index');
    } else {
      res.render('login');
    }
  });

app.get('/links',
  (req, res, next) => {

    if (Auth.verifySession(req)) {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.render('login');
    }

  });

app.post('/links',
  (req, res, next) => {

    if (Auth.verifySession(req)) {
      var url = req.body.url;
      if (!models.Links.isValidUrl(url)) {
        // send back a 404 if link is not valid
        return res.sendStatus(404);
      }

      return models.Links.get({ url })
        .then(link => {
          if (link) {
            throw link;
          }
          return models.Links.getUrlTitle(url);
        })
        .then(title => {
          return models.Links.create({
            url: url,
            title: title,
            baseUrl: req.headers.origin
          });
        })
        .then(results => {
          return models.Links.get({ id: results.insertId });
        })
        .then(link => {
          throw link;
        })
        .error(error => {
          res.status(500).send(error);
        })
        .catch(link => {
          res.status(200).send(link);
        });
    } else {
      res.render('login');
    }

  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup',
  (req, res) => {
    res.render('signup');
  });

app.post('/signup', (req, res, next) => {
  console.log('YAY, in signup');
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  // if(req.body.username)
  models.Users.create({ username: req.body.username, password: req.body.password })
    .then(newUser => {
      console.log(`new user created. session: ${JSON.stringify(req.session)} newUser: ${JSON.stringify(newUser)}`);
      models.Sessions.update({ 'id': req.session.id }, { 'userId': newUser.insertId })
        .then(() => {
          // console.log(`req.session: ${JSON.stringify(req.session)}`)
          res.redirect('/');
        });
    })
    .error(error => {
      res.redirect('/signup');
    });
});

app.get('/login',
  (req, res) => {
    res.render('login');
  });

app.post('/login', (req, res, next) => {
  // uses Models method "get" to attempt to retrieve a user based on username
  // if the user is found
  //   now we have the salt and password
  //   give the username, salt, and password to compare
  //   if match, success code and send to 'index'
  //   if fail, ????
  // else (i.e. user is not found)
  //   send to signup?
  models.Users.get({ username: req.body.username })
    .then(user => {
      if (models.Users.compare(req.body.password, user.password, user.salt)) {
        //start a session...
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    })
    .catch(err => {
      res.redirect('/login');
    });
});


/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
