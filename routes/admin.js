// 관리자 기능 처리
// 현재 관리자 ID: admin, PW: admin

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 관리자 권한 확인 미들웨어
function isAdmin(req, res, next) {
    if (!req.session.user) {
        return res.send(`
            <script>
                alert('로그인이 필요합니다.');
                location.href = '${req.app.locals.baseUrl || ''}/user/login';
            </script>
        `);
    }

    if (req.session.user.is_admin !== 1) {
        return res.send(`
            <script>
                alert('관리자만 접근할 수 있습니다.');
                history.back();
            </script>
        `);
    }

    next();
}

// 관리자 메인 페이지
router.get('/', isAdmin, (req, res) => {
    res.render('admin/index');
});

// 1. 관리자 상품관리
router.get('/products', isAdmin, (req, res) => {
    db.all('SELECT * FROM products ORDER BY id DESC', [], (err, products) => {
        if (err) {
            console.error('상품 조회 오류:', err.message);
            return res.status(500).send('상품 조회 실패');
        }

        res.render('admin/products', { products });
    });
});

// 상품 추가
router.post('/products/add', isAdmin, (req, res) => {
    const { name, price, description, image } = req.body;

    db.run(
        'INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)',
        [name, price, description, image],
        (err) => {
            if (err) {
                console.error('상품 추가 오류:', err.message);
                return res.status(500).send('상품 추가 실패');
            }

            res.redirect('/admin/products');
        }
    );
});

// 상품 삭제
router.post('/products/delete/:id', isAdmin, (req, res) => {
    const productId = req.params.id;

    db.run(
        'DELETE FROM products WHERE id = ?',
        [productId],
        (err) => {
            if (err) {
                console.error('상품 삭제 오류:', err.message);
                return res.status(500).send('상품 삭제 실패');
            }

            res.redirect('/admin/products');
        }
    );
});

// 2. 관리자 주문상태 관리
router.get('/orders', isAdmin, (req, res) => {
    const sql = `
        SELECT 
            orders.*,
            users.username,
            users.name
        FROM orders
        LEFT JOIN users ON orders.user_id = users.id
        ORDER BY orders.id DESC
    `;

    db.all(sql, [], (err, orders) => {
        if (err) {
            console.error('주문 조회 오류:', err.message);
            return res.status(500).send('주문 조회 실패');
        }

        res.render('admin/orders', { orders });
    });
});

// 주문 상태 변경
router.post('/orders/update/:id', isAdmin, (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId],
        (err) => {
            if (err) {
                console.error('주문 상태 변경 오류:', err.message);
                return res.status(500).send('주문 상태 변경 실패');
            }

            res.redirect('/admin/orders');
        }
    );
});

// 3. 관리자 회원 관리
router.get('/users', isAdmin, (req, res) => {
    db.all('SELECT id, username, name, status, is_admin FROM users ORDER BY id DESC', [], (err, users) => {
        if (err) {
            console.error('회원 조회 오류:', err.message);
            return res.status(500).send('회원 조회 실패');
        }

        res.render('admin/users', { users });
    });
});

// 회원 강제 탈퇴 처리
router.post('/users/delete/:id', isAdmin, (req, res) => {
    const userId = req.params.id;

    db.run(
        'UPDATE users SET status = ? WHERE id = ?',
        ['DELETED', userId],
        (err) => {
            if (err) {
                console.error('회원 탈퇴 처리 오류:', err.message);
                return res.status(500).send('회원 탈퇴 처리 실패');
            }

            res.redirect('/admin/users');
        }
    );
});

module.exports = router;