from app.models.schemas import TokenState

# Active states = states where user is "in the system"
ACTIVE_STATES = {
    TokenState.CREATED,
    TokenState.WAITING,
    TokenState.NEAR,
    TokenState.CONFIRMING,
    TokenState.CONFIRMED,
    TokenState.CALLED,
    TokenState.SERVING
}

VALID_TRANSITIONS = {
    TokenState.CREATED: {TokenState.WAITING},
    TokenState.WAITING: {TokenState.NEAR, TokenState.CONFIRMED, TokenState.MISSED, TokenState.EXPIRED},
    TokenState.NEAR: {TokenState.CONFIMED, TokenState.CONFIRMING, TokenState.WAITING, TokenState.MISSED, TokenState.EXPIRED},
    TokenState.CONFIRMING: {TokenState.CONFIRMED, TokenState.NEAR, TokenState.MISSED, TokenState.EXPIRED},
    TokenState.CONFIRMED: {TokenState.CALLED, TokenState.MISSED, TokenState.EXPIRED},
    TokenState.CALLED: {TokenState.SERVING, TokenState.MISSED, TokenState.EXPIRED},
    TokenState.SERVING: {TokenState.DONE},
    TokenState.DONE: set(),
    TokenState.MISSED: set(),
    TokenState.EXPIRED: set(),
}

def can_transition(current: TokenState, next_state: TokenState) -> bool:
    allowed = VALID_TRANSITIONS.get(current, set())
    return next_state in allowed
