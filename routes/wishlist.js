const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// 프로젝트에서 사용 중인 SQLite DB 연결
const db = new sqlite3.Database('./db/database.sqlite');

/**
 * 위시리스트에 상품 추가
 * 1. 로그인 여부 확인
 * 2. URL에서 productId 가져오기
 * 3. wishlist 테이블에 user_id, product_id 저장
 * 4. 이미 찜한 상품이면 중복 저장하지 않음
 */
router.post('/add/:productId', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 요청 팝업 알림을 띄우기
    if (!user) {
        return res.send(`
        <script>
            alert('로그인 후 이용해주시기 바랍니다.');
            history.back();
        </script>
    `);
        // 로그인 창으로 이동
        // return res.redirect('/login');
    }

    const productId = req.params.productId;

    const sql = `
        INSERT OR IGNORE INTO wishlist
        (
            user_id,
            product_id
        )
        VALUES (?, ?)
    `;

    db.run(sql, [user.id, productId], (err) => {
        if (err) {
            console.error('위시리스트 추가 오류:', err.message);
            return res.status(500).send('위시리스트 추가 실패');
        }
    });
});

/**
 * 위시리스트에서 상품 삭제
 * 1. 로그인 여부 확인
 * 2. 현재 로그인한 사용자의 위시리스트에서만 삭제
 * 3. 삭제 후 위시리스트 페이지로 이동
 */
router.post('/remove/:productId', (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.redirect('/login');
    }

    const productId = req.params.productId;

    const sql = `
        DELETE FROM wishlist
        WHERE user_id = ?
          AND product_id = ?
    `;

    db.run(sql, [user.id, productId], (err) => {
        if (err) {
            console.error('위시리스트 삭제 오류:', err.message);
            return res.status(500).send('위시리스트 삭제 실패');
        }

        res.redirect('/mypage/wishlist');
    });
});

module.exports = router;