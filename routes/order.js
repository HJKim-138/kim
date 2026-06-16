// // routes/order.js
// const express = require('express');
// const router = express.Router();
//
// router.post('/confirm', (req, res) => {
//     // 실제 주문 로직은 생략하고 더미 페이지 렌더링
//     res.render('order_confirm', {
//         user: req.session.user || { name: '손님' }, // 사용자 세션
//     });
// });
//
// module.exports = router;

// // 장바구니에 내용이 있을 때만 주문 가능하게 수정
// const express = require('express');
// const router = express.Router();
// const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('./db/database.sqlite');
//
// router.post('/confirm', (req, res) => {
//     const user = req.session.user;
//     if (!user) return res.redirect('/login');
//
//     const query = `SELECT COUNT(*) AS count FROM cart_items WHERE user_id = ?`;
//
//     db.get(query, [user.id], (err, row) => {
//         if (err) return res.status(500).send('DB 오류: 장바구니 확인 실패');
//         if (row.count === 0) {
//             return res.render('order_confirm', {
//                 user,
//                 error: '장바구니가 비어 있어 주문할 수 없습니다.',
//             });
//         }
//
//         // 장바구니에 상품이 있는 경우만 주문 확인 페이지 렌더링
//         res.render('order_confirm', { user });
//     });
// });
//
// module.exports = router;


// 주문 과정을 다음과 같이 변경
// 1. 장바구니
// 2. 주문하기
// 3. 주문서 작성
// 4. 주문 완료
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/database.sqlite');

router.get('/checkout', (req, res) => {

    const user = req.session.user;

    if (!user)
        return res.redirect('/login');

    const sql = `
        SELECT p.*, c.quantity
        FROM cart_items c
        JOIN products p
            ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.all(sql, [user.id], (err, items) => {

        if (err)
            return res.status(500).send('DB 오류');

        if (items.length === 0)
            return res.redirect('/cart');

        const totalPrice =
            items.reduce(
                (sum, item) =>
                    sum + item.price * item.quantity,
                0
            );

        res.render('checkout', {
            items,
            totalPrice,
            user
        });
    });
});

// 실제 주문 생성
router.post('/create', (req, res) => {

    const user = req.session.user;

    if (!user)
        return res.redirect('/login');

    const {
        receiver_name,
        receiver_phone,
        address
    } = req.body;

    const cartSql = `
        SELECT p.id,
               p.price,
               c.quantity
        FROM cart_items c
        JOIN products p
            ON p.id = c.product_id
        WHERE c.user_id = ?
    `;

    db.all(cartSql, [user.id], (err, items) => {

        if (err)
            return res.status(500).send('DB 오류');

        const totalPrice =
            items.reduce(
                (sum, item) =>
                    sum + item.price * item.quantity,
                0
            );

        db.run(
            `
            INSERT INTO orders
            (
                user_id,
                receiver_name,
                receiver_phone,
                address,
                total_price
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                user.id,
                receiver_name,
                receiver_phone,
                address,
                totalPrice
            ],
            function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).send(err.message);

                }

                const orderId = this.lastID;

                items.forEach(item => {
                    db.run(
                        `
                        INSERT INTO order_items
                        (
                            order_id,
                            product_id,
                            quantity,
                            price
                        )
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            orderId,
                            item.id,
                            item.quantity,
                            item.price
                        ]
                    );
                });

                db.run(
                    `
                    DELETE
                    FROM cart_items
                    WHERE user_id = ?
                    `,
                    [user.id],
                    function (err) {
                        if (err) {
                            console.error(err.message);
                            return res.status(500).send(err.message);
                        }
                    }
                );

                res.render(
                    'order_confirm',
                    {
                        user,
                        orderId
                    }
                );
            }
        );
    });
});

module.exports = router;
