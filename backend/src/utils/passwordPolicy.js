/** Shared password rules for register / reset / admin create. */
export function passwordSchemaRefine(password, ctx) {
  if (password.length < 8) {
    ctx.addIssue({ code: "custom", message: "Slaptažodis turi būti bent 8 simbolių" });
    return;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    ctx.addIssue({
      code: "custom",
      message: "Slaptažodyje turi būti bent viena raidė ir vienas skaičius"
    });
  }
}

export const PASSWORD_HINT = "Bent 8 simboliai, raidė ir skaičius";
