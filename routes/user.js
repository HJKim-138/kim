const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 회원가입 페이지
router.get('/register', (req, res) => {
    res.render('register'); //register.ejs
});

// 회원가입 처리
// 아이디 없음 : 신규 회원가입
// 아이디 있음 AND status ACTIVE : 이미 가입된 계정입니다.
// 아이디 있음 AND status DELETED AND 이름 일치 : 재가입 성공
// 아이디 있음 AND status DELETED AND 이름 불일치 : 이름이 일치하지 않아 재가입할 수 없습니다.
router.post('/register', async (req, res) => {
    const { username, password, name } = req.body;

    // 1. 먼저 같은 아이디가 있는지 조회
    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err) {
                console.error('회원 조회 오류:', err.message);
                return res.status(500).send('회원가입 처리 중 오류가 발생했습니다.');
            }

            // 2. 이미 존재하는 계정인 경우
            if (user) {
                // 2-1. 탈퇴한 회원이면 재가입 처리 가능
                if (user.status === 'DELETED') {
                    // 이름이 일치하지 않으면 재가입 실패
                    if (user.name !== name) {
                        return res.status(400).render('register_failed', {
                            message: '이름이 일치하지 않아 재가입할 수 없습니다.'
                        });
                    }

                    // 이름이 일치하면 비밀번호 새로 암호화 후 ACTIVE로 변경
                    const hashedPassword = await bcrypt.hash(password, 10);

                    db.run(
                        'UPDATE users SET password = ?, status = ? WHERE username = ?',
                        [hashedPassword, 'ACTIVE', username],
                        (updateErr) => {
                            if (updateErr) {
                                console.error('재가입 처리 오류:', updateErr.message);
                                return res.status(500).render('register_failed', {
                                    message: '재가입 처리 중 오류가 발생했습니다.'
                                });
                            }

                            return res.render('rejoin_success');
                        }
                    );

                    return;
                }

                // 2-2. 이미 활성화된 회원이면 기존 중복 가입 처리
                return res.status(400).render('register_failed', {
                    message: '이미 가입된 계정입니다.'
                });
            }

            // 3. 존재하지 않는 계정이면 신규 회원가입
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO users (username, password, name, status) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, name, 'ACTIVE'],
                (insertErr) => {
                    if (insertErr) {
                        console.error('회원가입 오류:', insertErr.message);
                        return res.status(500).render('register_failed', {
                            message: '회원가입 실패'
                        });
                    }

                    res.redirect('/user/login');
                }
            );
        }
    );
});

// 로그인 페이지
router.get('/login', (req, res) => {
    res.render('login'); //login.ejs
});

// 로그인 처리
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 탈퇴한 회원일 경우 로그인이 불가하도록 수정
    db.get('SELECT * FROM users WHERE username = ? AND status = \'ACTIVE\'', [username], async (err, user) => {

        // 탈퇴 기능 추가에 따라 예외 처리 부분 수정
        if (err) {
            console.error('로그인 조회 오류:', err.message);
            return res.status(500).send('로그인 처리 중 오류가 발생했습니다.');
        }
        // ID가 없거나 탈퇴한 사용자일 경우 팝업 알림이 뜨도록 수정
        if (!user) {
            return res.send(`
        <script>
            alert('존재하지 않거나 탈퇴한 사용자입니다.');
            history.back();
        </script>
    `);
            //return res.send('존재하지 않거나 탈퇴한 사용자입니다.');
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;

            // 관리자 계정이면 관리자 페이지로 이동
            if (user.is_admin === 1) {
                return res.redirect('/admin');
            }

            // 일반 회원이면 홈으로 이동
            return res.redirect('/');
        } else {
            res.status(401).render('login_failed');
        }
    });
});

// 로그아웃
// router.get('/logout', (req, res) => {
//     req.session.destroy();
//     res.redirect('/');
// });
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ 로그아웃 오류:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
