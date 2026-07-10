데이터베이스 설계 전문가로서 요청하신 `custmaster` 테이블에 대한 설계 문서를 작성해 드립니다.

---

# 데이터베이스 설계 문서: 거래처 관리 시스템

## 1. 테이블 상세 명세

### `custmaster` (거래처관리)
거래처의 기본 정보를 관리하는 테이블입니다.

| 컬럼명 | 코멘트 | 타입 | 크기 | 제약조건 | 기본값 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUSTCD** | 거래처코드 | VARCHAR | 50 | PK, Not Null, Unique | - |
| **CUSTNM** | 거래처명 | VARCHAR | 255 | Not Null | - |
| **CUSTTP** | 거래처타입 | VARCHAR | 50 | - | NULL |
| **BIZCODE** | 사업자번호 | VARCHAR | 50 | - | NULL |

---

## 2. 테이블 관계 다이어그램 (ERD)

현재 단일 테이블 구조이므로 관계가 존재하지 않으나, 향후 확장성을 고려한 구조는 다음과 같습니다.

```text
[custmaster]
+-----------------+
| PK CUSTCD       |
|    CUSTNM       |
|    CUSTTP       |
|    BIZCODE      |
+-----------------+
```

---

## 3. DDL SQL (PostgreSQL)

```sql
-- 거래처관리 테이블 생성
CREATE TABLE custmaster (
    CUSTCD VARCHAR(50) PRIMARY KEY,
    CUSTNM VARCHAR(255) NOT NULL,
    CUSTTP VARCHAR(50) DEFAULT NULL,
    BIZCODE VARCHAR(50) DEFAULT NULL
);

-- 코멘트 추가
COMMENT ON TABLE custmaster IS '거래처관리';
COMMENT ON COLUMN custmaster.CUSTCD IS '거래처코드';
COMMENT ON COLUMN custmaster.CUSTNM IS '거래처명';
COMMENT ON COLUMN custmaster.CUSTTP IS '거래처타입';
COMMENT ON COLUMN custmaster.BIZCODE IS '사업자번호';
```

---

## 4. 설계 시 고려사항

1. **데이터 무결성 (Data Integrity):**
   - `CUSTCD`는 시스템 내에서 거래처를 식별하는 핵심 키이므로, 비즈니스 로직에 따라 자동 생성 규칙(예: 시퀀스 또는 접두사+번호)을 수립하는 것이 좋습니다.
   - `CUSTNM`은 필수 입력값(`NOT NULL`)으로 설정하여 데이터 누락을 방지했습니다.

2. **확장성 (Scalability):**
   - `CUSTTP` (거래처타입)의 경우, 향후 데이터의 일관성을 위해 별도의 코드 테이블(예: `common_code`)을 생성하여 외래키(FK)로 관리하는 것을 권장합니다.
   - `BIZCODE`는 검색 빈도가 높을 것으로 예상되므로, 조회 성능 최적화가 필요할 경우 인덱스(Index) 생성을 고려하십시오.

3. **성능 최적화 (Performance):**
   - PostgreSQL에서 `VARCHAR` 타입은 가변 길이 문자열을 효율적으로 처리하지만, 검색 속도를 위해 `CUSTNM`이나 `BIZCODE`를 활용한 검색이 잦다면 B-tree 인덱스 추가를 검토하십시오.

4. **보안 및 유지보수:**
   - 사업자번호(`BIZCODE`)는 개인정보 또는 민감정보로 분류될 가능성이 있으므로, 필요 시 컬럼 암호화(Encryption) 적용을 검토하시기 바랍니다.

---
*본 문서는 PostgreSQL 환경을 기준으로 작성되었으며, 향후 테이블 추가 시 관계형 데이터베이스의 정규화 원칙을 준수하여 설계하시기 바랍니다.*