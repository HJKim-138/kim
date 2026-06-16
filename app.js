var createError = require('http-errors');
var express = require('express');
const path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const boardRouter = require('./routes/board');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const userRouter = require('./routes/user');
const productRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/order');
const mypageRouter = require('./routes/mypage');
const wishlistRouter = require('./routes/wishlist');
const adminRouter = require('./routes/admin');

var app = express();

// BASE_URL 설정
// - 로컬/테스트: BASE_URL을 지정하지 않으면 '' 이므로 /products 처럼 동작
// - 학교 서버: BASE_URL=/stud5 로 실행하면 /stud5/products 처럼 동작
const baseUrl = process.env.BASE_URL || '';
app.locals.baseUrl = baseUrl;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// /stud5 같은 하위 경로로 들어온 요청은 Express 라우터가 처리할 수 있게 앞부분을 제거
// 예: /stud5/mypage -> /mypage
app.use((req, res, next) => {
  if (baseUrl && req.url.startsWith(baseUrl + '/')) {
    req.url = req.url.slice(baseUrl.length);
  } else if (baseUrl && req.url === baseUrl) {
    req.url = '/';
  }
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
}));

// 아래 미들웨어 위치는 app.use('/', indexRouter); 보다 위에 있어야 함
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.baseUrl = baseUrl;

  // res.redirect('/cart')처럼 작성된 기존 코드도
  // BASE_URL=/stud5 환경에서는 /stud5/cart 로 이동하도록 보정
  const originalRedirect = res.redirect.bind(res);
  res.redirect = function(statusOrUrl, maybeUrl) {
    let status = null;
    let url = statusOrUrl;

    if (typeof statusOrUrl === 'number') {
      status = statusOrUrl;
      url = maybeUrl;
    }

    if (baseUrl && typeof url === 'string' && url.startsWith('/') && !url.startsWith(baseUrl + '/')) {
      url = baseUrl + url;
    }

    return status ? originalRedirect(status, url) : originalRedirect(url);
  };

  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/user',userRouter);
app.use('/board', boardRouter);
app.get('/login', (req,res)=> {
  res.redirect('/user/login');
});
app.get('/login_required', (req, res) => {
  res.status(401).render('login_required', {
    message: '로그인이 필요합니다.',
    redirectUrl: (req.app.locals.baseUrl || '') + '/login'
  });
});
app.use('/products',productRouter);
app.use('/cart', cartRouter);
app.use('/order',orderRouter);
app.use('/mypage', mypageRouter);
app.use('/wishlist', wishlistRouter);
app.use('/admin', adminRouter);

app.use(express.static(path.join(__dirname, 'public')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use((req, res) => {
  res.status(404).send(`404 NOT FOUND: ${req.originalUrl}`);
});

module.exports = app;

