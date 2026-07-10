데이터베이스 설계 전문가로서 제공해주신 `polist` 테이블 정보를 바탕으로 PostgreSQL 환경에 최적화된 설계 문서를 작성하였습니다.

---

# 데이터베이스 설계 문서: 구매 관리 시스템

## 1. 테이블 상세 정의: `polist` (구매입력)

| 컬럼명 | 데이터 타입 | 길이 | PK | Not Null | 코멘트 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `PONO` | VARCHAR | 50 | Y | Y | 구매번호 |
| `PODATE` | DATE | - | N | N | 구매일자 |
| `CUSTCD` | VARCHAR | 50 | N | N | 거래처코드 |
| `CUSTNM` | VARCHAR | 255 | N | N | 거래처명 |
| `ITEMCD` | VARCHAR | 50 | N | N | 품목코드 |
| `PRICE1` | NUMERIC | 19,4 | N | N | 입고단가 |
| `QTY` | INT | - | N | N | 수량 |
| `AMT1` | NUMERIC | 19,4 | N | N | 공급가액 |
| `AMT2` | NUMERIC | 19,4 | N | N | 부가세 |
| `AMT3` | NUMERIC | 19,4 | N | N | 합계금액 |

---

## 2. 테이블 관계 다이어그램 (ERD)

현재 단일 테이블 구조이나, 향후 확장성을 고려한 논리적 관계는 다음과 같습니다.

```text
[CUST_MASTER] (거래처) 1 --- N [polist] (구매입력)
[ITEM_MASTER] (품목)   1 --- N [polist] (구매입력)
```
*참고: 현재 설계는 비정규화된 형태이므로, 향후 마스터 테이블과의 연동을 권장합니다.*

---

## 3. DDL SQL (PostgreSQL)

제공해주신 정보에서 데이터 타입(VARCHAR로 선언된 금액/날짜)을 실제 데이터 성격에 맞게 최적화하여 작성하였습니다.

```sql
-- 구매입력 테이블 생성
CREATE TABLE polist (
    PONO    VARCHAR(50) PRIMARY KEY,
    PODATE  DATE,
    CUSTCD  VARCHAR(50),
    CUSTNM  VARCHAR(255),
    ITEMCD  VARCHAR(50),
    PRICE1  NUMERIC(19, 4),
    QTY     INT,
    AMT1    NUMERIC(19, 4),
    AMT2    NUMERIC(19, 4),
    AMT3    NUMERIC(19, 4)
);

-- 코멘트 추가
COMMENT ON TABLE polist IS '구매입력';
COMMENT ON COLUMN polist.PONO IS '구매번호';
COMMENT ON COLUMN polist.PODATE IS '구매일자';
COMMENT ON COLUMN polist.CUSTCD IS '거래처';
COMMENT ON COLUMN polist.CUSTNM IS '거래처명';
COMMENT ON COLUMN polist.ITEMCD IS '품목코드';
COMMENT ON COLUMN polist.PRICE1 IS '입고단가';
COMMENT ON COLUMN polist.QTY IS '수량';
COMMENT ON COLUMN polist.AMT1 IS '공급가액';
COMMENT ON COLUMN polist.AMT2 IS '부가세';
COMMENT ON COLUMN polist.AMT3 IS '합계금액';
```

---

## 4. 설계 시 고려사항 (전문가 제언)

1.  **데이터 타입 최적화**: 
    *   기존 설계에서 `PODATE`, `PRICE1`, `AMT` 등이 `VARCHAR`로 정의되어 있었으나, PostgreSQL에서는 날짜는 `DATE`, 금액은 `NUMERIC` 타입을 사용하는 것이 연산 속도와 데이터 무결성 측면에서 훨씬 유리합니다.
2.  **정규화(Normalization)**:
    *   현재 `CUSTNM`(거래처명)이 `polist` 테이블에 직접 저장되고 있습니다. 이는 거래처 정보 변경 시 모든 구매 내역을 수정해야 하는 위험이 있습니다. `CUSTCD`를 외래키(FK)로 활용하여 별도의 거래처 마스터 테이블을 운영하는 것을 강력히 권장합니다.
3.  **계산 로직의 DB 처리**:
    *   `AMT1`, `AMT2`, `AMT3`는 `PRICE1`과 `QTY`에 의해 결정되는 종속 데이터입니다. 애플리케이션 단에서 계산하여 저장할 수도 있지만, 데이터 정합성을 위해 `GENERATED ALWAYS AS` 구문을 사용하거나, `TRIGGER`를 통해 자동 계산되도록 설계할 수 있습니다.
4.  **인덱스 전략**:
    *   `PODATE`와 `CUSTCD`는 조회 조건으로 자주 사용될 가능성이 높습니다. 데이터가 많아질 경우 해당 컬럼들에 인덱스(B-Tree)를 생성하여 조회 성능을 확보하십시오.
5.  **제약 조건**:
    *   `QTY`는 음수가 될 수 없으므로 `CHECK (QTY >= 0)` 제약 조건을 추가하여 데이터 오류를 방지하는 것이 좋습니다.