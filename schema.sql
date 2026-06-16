-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,
                                     name TEXT NOT NULL,

                                     -- 회원 상태(회원 탈퇴/재가입 구현을 위해 추가)
                                     -- ACTIVE: 정상 회원
                                     -- DELETED: 탈퇴 회원
                                     status TEXT DEFAULT 'ACTIVE',

                                     -- 관리자 여부
                                     -- 현재 관리자 ID: admin, PW: admin
                                     is_admin INTEGER DEFAULT 0
);

-- 게시글 테이블
CREATE TABLE IF NOT EXISTS posts (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     title TEXT NOT NULL,
                                     content TEXT NOT NULL,
                                     parent_id INTEGER,
                                     author TEXT NOT NULL,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--  상품목록 테이블
CREATE TABLE IF NOT EXISTS products (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        name TEXT NOT NULL,              -- 상품명
                                        description TEXT,                -- 상품 설명
                                        price INTEGER NOT NULL,          -- 가격 (원 단위)
                                        emoji TEXT,                      -- 이모지 (간단한 시각적 표시용)
                                        image TEXT,                      -- 이미지 파일 경로
                                        likes INTEGER DEFAULT 0,         -- 선호도 (추천수, 고객클릭수 등)
                                        is_featured INTEGER DEFAULT 0    -- 오늘의 추천 상품 여부 (1=추천)
);

-- 장바구니 테이블

DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
                            user_id INTEGER NOT NULL,
                            product_id INTEGER NOT NULL,
                            quantity INTEGER DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY(user_id, product_id)
);

-- 주문 & 주문 상세 테이블 추가
-- 주문 테이블
CREATE TABLE IF NOT EXISTS orders (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      user_id INTEGER NOT NULL,
                                      receiver_name TEXT NOT NULL,
                                      receiver_phone TEXT NOT NULL,
                                      address TEXT NOT NULL,
                                      total_price INTEGER NOT NULL,
                                      status TEXT DEFAULT '결제완료',
                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                      FOREIGN KEY(user_id) REFERENCES users(id)
    );

-- 주문 상세 테이블
CREATE TABLE IF NOT EXISTS order_items (
                                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                                           order_id INTEGER NOT NULL,
                                           product_id INTEGER NOT NULL,
                                           quantity INTEGER NOT NULL,
                                           price INTEGER NOT NULL,
                                           FOREIGN KEY(order_id) REFERENCES orders(id),
                                           FOREIGN KEY(product_id) REFERENCES products(id)
    );

-- 마이페이지 내 위시리스트 테이블
CREATE TABLE IF NOT EXISTS wishlist (
                                        user_id INTEGER NOT NULL,
                                        product_id INTEGER NOT NULL,
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- 한 사용자가 같은 상품을 중복으로 찜하지 못하게 설정
                                        PRIMARY KEY (user_id, product_id)
    );

-- 게시글의 첨부파일 테이블--
CREATE TABLE IF NOT EXISTS files (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     post_id INTEGER NOT NULL,
                                     filename TEXT NOT NULL,            -- 서버 저장용
                                     original_filename TEXT NOT NULL,   -- 유저가 게시한 원본 파일명
                                     filepath TEXT NOT NULL,
                                     uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);