/*
write a middleware function that will:
1) access the cookies on an incoming request
2) parse them into an object
3) and assign this object to a cookies property on the request
*/

const parseCookies = (req, res, next) => {

  req.cookies = {};
  if (req.headers.cookie) {
    let arrOfCookieStrs = req.headers.cookie.split(';');
    arrOfCookieStrs.forEach(cookieStr => {
      let cookiePairArr = cookieStr.trim().split('=');
      req.cookies[cookiePairArr[0]] = cookiePairArr[1];
    });
  }
  next();
};

module.exports = parseCookies;