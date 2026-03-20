"""
LSA ↔ eLSA 점수 체계 양방향 변환

LSA: 8항목 100점 만점 (정량 60 + 정성 40)
  정량: 팀역량(15), 시장규모(15), 트랙션(15), 비즈니스모델(15)
  정성: 문제정의(10), 솔루션차별화(10), 실행력(10), AC적합성(10)

eLSA: 5항목 가중평균 (0.0 ~ 1.0)
  Team(25%), Tech(25%), Market(20%), Traction(15%), IP(15%)
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class LsaScores:
    team: float         # /15
    market: float       # /15
    traction: float     # /15
    biz_model: float    # /15
    problem: float      # /10
    solution: float     # /10
    execution: float    # /10
    ac_fit: float       # /10

    @property
    def quantitative(self) -> float:
        return self.team + self.market + self.traction + self.biz_model

    @property
    def qualitative(self) -> float:
        return self.problem + self.solution + self.execution + self.ac_fit

    @property
    def total(self) -> float:
        return self.quantitative + self.qualitative


@dataclass(frozen=True)
class ElsaScores:
    team: float       # 0.0 ~ 1.0
    tech: float       # 0.0 ~ 1.0
    market: float     # 0.0 ~ 1.0
    traction: float   # 0.0 ~ 1.0
    ip: float         # 0.0 ~ 1.0

    WEIGHTS = {"team": 0.25, "tech": 0.25, "market": 0.20, "traction": 0.15, "ip": 0.15}

    @property
    def weighted_average(self) -> float:
        return (
            self.team * self.WEIGHTS["team"]
            + self.tech * self.WEIGHTS["tech"]
            + self.market * self.WEIGHTS["market"]
            + self.traction * self.WEIGHTS["traction"]
            + self.ip * self.WEIGHTS["ip"]
        )


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def lsa_to_elsa(lsa: LsaScores) -> ElsaScores:
    """LSA 8항목 → eLSA 5항목 변환"""
    return ElsaScores(
        team=_clamp(lsa.team / 15.0),
        tech=_clamp((lsa.solution / 10.0) * 0.6 + (lsa.biz_model / 15.0) * 0.4),
        market=_clamp((lsa.market / 15.0) * 0.7 + (lsa.problem / 10.0) * 0.3),
        traction=_clamp((lsa.traction / 15.0) * 0.7 + (lsa.execution / 10.0) * 0.3),
        ip=_clamp(lsa.solution / 10.0),
    )


def elsa_to_lsa(elsa: ElsaScores) -> LsaScores:
    """eLSA 5항목 → LSA 8항목 역변환 (근사치).

    주의: 5→8 변환은 정보 손실이 있는 역방향 매핑이므로 정확한 복원이 불가능.
    간이 비례 배분 방식을 사용하며, 결과는 참고용으로만 활용해야 함.
    """
    def _clamp_score(value: float, max_score: float) -> float:
        return round(max(0.0, min(max_score, value)), 1)

    return LsaScores(
        team=_clamp_score(elsa.team * 15.0, 15.0),
        market=_clamp_score(elsa.market * 15.0, 15.0),
        traction=_clamp_score(elsa.traction * 15.0, 15.0),
        biz_model=_clamp_score(elsa.tech * 15.0, 15.0),
        problem=_clamp_score(elsa.market * 10.0, 10.0),
        solution=_clamp_score(elsa.ip * 10.0, 10.0),
        execution=_clamp_score(elsa.traction * 10.0, 10.0),
        ac_fit=_clamp_score(elsa.team * 10.0, 10.0),
    )


def lsa_total_to_elsa_weighted(total: float) -> float:
    """LSA 총점(0~100) → eLSA 가중평균(0~1) 간이 변환"""
    return _clamp(total / 100.0)


def elsa_weighted_to_lsa_total(weighted: float) -> float:
    """eLSA 가중평균(0~1) → LSA 총점(0~100) 간이 변환"""
    return round(_clamp(weighted, 0.0, 1.0) * 100.0, 1)
