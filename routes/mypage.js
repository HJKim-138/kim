/** 마이페이지 기능을 수행하는 자바스크립트 파일
 * 로그인한 사용자의 회원 정보 저장
 * 주문 내역, 위시리스트 목록 저장
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/database.sqlite');

router.get('/', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    res.render('mypage', { user });
});

/** 내 주문내역 조회
 * 현재 로그인한 사용자의 orders 테이블 데이터만 조회
 * created_at를 기준으로 내림차순 정렬(최신 주문이 위에 위치)
 */
router.get('/orders', (req, res) => {
    const user = req.session.user;

    // 로그인 확인
    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT
            id,
            receiver_name,
            receiver_phone,
            address,
            total_price,
            status,
            created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.all(sql, [user.id], (err, orders) => {
        if (err) {
            console.error('주문내역 조회 오류:', err.message);
            return res.status(500).send('주문내역 조회 실패');
        }

        res.render('mypage_orders', {
            user,
            orders
        });
    });
});



/**
 * 내 위시리스트 조회
 * 1. 로그인 여부 확인
 * 2. wishlist 테이블에서 현재 로그인한 사용자의 찜 목록 조회
 * 3. products 테이블과 JOIN해서 상품명, 가격, 이미지 정보까지 함께 가져옴
 * 4. mypage_wishlist.ejs 화면에 전달
 */
router.get('/wishlist', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.emoji,
            p.image,
            w.created_at
        FROM wishlist w
        JOIN products p
            ON w.product_id = p.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
    `;

    db.all(sql, [user.id], (err, wishlistItems) => {
        if (err) {
            console.error('위시리스트 조회 오류:', err.message);
            return res.status(500).send('위시리스트 조회 실패');
        }

        res.render('mypage_wishlist', {
            user,
            wishlistItems
        });
    });
});



/**
 * 내 정보 조회 페이지
 * 현재 로그인한 사용자의 정보를 users 테이블에서 다시 조회
 */
router.get('/info', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT
            id,
            username,
            name,
            status
        FROM users
        WHERE id = ?
          AND status = 'ACTIVE'
    `;

    db.get(sql, [user.id], (err, userInfo) => {
        //if (err) {
        //    console.error('내 정보 조회 오류:', err.message);
        //    return res.status(500).send('내 정보 조회 실패');
        //}
        if (err) {
            console.error(err);
            return res.status(500).send(err.message);
        }

        if (!userInfo) {
            return res.redirect('/user/logout');
        }

        res.render('mypage_info.ejs', {
            user: userInfo
        });
    });
});



/**
 * 회원정보 수정 화면
 * 1. 현재 로그인한 사용자의 기존 이름을 조회해서 수정 폼에 보여준다.
 * 2. 비밀번호는 화면에 표시하지 않는다.
 */
router.get('/edit', (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT
            id,
            username,
            name
        FROM users
        WHERE id = ?
          AND status = 'ACTIVE'
    `;

    db.get(sql, [user.id], (err, userInfo) => {
        if (err) {
            console.error('회원정보 수정 화면 조회 오류:', err.message);
            return res.status(500).send('회원정보 수정 화면 조회 실패');
        }

        if (!userInfo) {
            return res.redirect('/user/logout');
        }

        res.render('mypage_edit', {
            user: userInfo
        });
    });
});

/**
 * 회원정보 수정 처리
 * 1. 이름은 항상 수정 가능
 * 2. 새 비밀번호를 입력한 경우에만 비밀번호 변경
 * 3. 새 비밀번호를 비워두면 기존 비밀번호 유지
 */
router.post('/edit', (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.redirect('/login');
    }

    const {
        name,
        password
    } = req.body;

    // 이름 입력값 검증
    if (!name || name.trim() === '') {
        return res.status(400).send('이름을 입력해주세요.');
    }

    /**
     * 비밀번호를 입력한 경우:
     * name과 password를 함께 수정한다.
     */
    if (password && password.trim() !== '') {
        const sql = `
            UPDATE users
            SET
                name = ?,
                password = ?
            WHERE id = ?
              AND status = 'ACTIVE'
        `;

        db.run(sql, [name, password, user.id], function(err) {
            if (err) {
                console.error('회원정보 수정 오류:', err.message);
                return res.status(500).send('회원정보 수정 실패');
            }

            // 세션에 저장된 사용자 이름도 최신 값으로 갱신
            req.session.user.name = name;

            res.redirect('/mypage/info');
        });
    }

    /**
     * 비밀번호를 입력하지 않은 경우:
     * name만 수정하고 password는 기존값을 유지한다.
     */
    else {
        const sql = `
            UPDATE users
            SET name = ?
            WHERE id = ?
              AND status = 'ACTIVE'
        `;

        db.run(sql, [name, user.id], function(err) {
            if (err) {
                console.error('회원정보 수정 오류:', err.message);
                return res.status(500).send('회원정보 수정 실패');
            }

            // 세션 정보 갱신
            req.session.user.name = name;

            res.redirect('/mypage/info');
        });
    }
});



/**
 * 회원탈퇴 확인 화면(사용자가 실수로 탈퇴하는 경우 방지)
 */
router.get('/delete', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    res.render('mypage_delete', {
        user
    });
});

/**
 * 회원탈퇴 처리
 * 1. users 테이블에서 실제로 DELETE하지 않는다.
 * 2. 대신 status 값을 'DELETED'로 변경한다.
 */
router.post('/delete', (req, res) => {
    const user = req.session.user;

    // 로그인하지 않은 사용자는 로그인 페이지로 이동
    if (!user) {
        return res.redirect('/login');
    }

    const sql = `
        UPDATE users
        SET status = 'DELETED'
        WHERE id = ?
    `;

    db.run(sql, [user.id], function(err) {
        if (err) {
            console.error('회원탈퇴 오류:', err.message);
            return res.status(500).send('회원탈퇴 실패');
        }

        // 탈퇴 처리 후 세션 삭제
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

module.exports = router;