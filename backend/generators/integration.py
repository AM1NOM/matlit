import sympy
from sympy import symbols, integrate, diff, simplify, latex

x = symbols('x')



import random

def easy_antiderivative():
    # simple polynomial: guarantees basic power-rule integrals
    degree = random.randint(2, 4)
    coeffs = [random.randint(-5, 5) for _ in range(degree + 1)]
    return sum(c * x**i for i, c in enumerate(coeffs) if c != 0) or x

def medium_antiderivative():
    # adds trig / exponential terms -> needs standard rules, not just power rule
    choices = [
        sympy.sin(random.randint(1, 3) * x),
        sympy.cos(random.randint(1, 3) * x),
        sympy.exp(random.randint(1, 3) * x),
        x**random.randint(2, 3),
    ]
    a, b = random.sample(choices, 2)
    return random.randint(1, 5) * a + random.randint(1, 5) * b

def hard_antiderivative():
    # products -> differentiating gives something needing substitution/parts to reverse
    n = random.randint(2, 3)
    base = x**n
    wrapper = random.choice([sympy.sin(x), sympy.cos(x), sympy.exp(x), sympy.log(x)])
    return base * wrapper

DIFFICULTY_GENERATORS = {
    "easy": easy_antiderivative,
    "medium": medium_antiderivative,
    "hard": hard_antiderivative,
}

def make_integral_question(antiderivative_expr):
    f = sympy.diff(antiderivative_expr, x)
    terms = sympy.Add.make_args(sympy.expand(f))

    steps = [f"Integrate each term of {f} separately."]
    for term in terms:
        term_integral = sympy.integrate(term, x)
        steps.append(f"∫ {term} dx = {term_integral}")
    steps.append(f"Combine and add the constant of integration: {antiderivative_expr} + C")

    return {"question": f"Find ∫ {f} dx", "answer": f"{antiderivative_expr} + C", "steps": steps}

def generate():
    F = DIFFICULTY_GENERATORS['hard']()
    return make_integral_question(F)

