import { createAccessControl } from "better-auth/plugins/access";

const statement = {
	user: ["create", "list", "set-role", "ban", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
	user: ["create", "list", "set-role", "ban", "delete"],
});

export const user = ac.newRole({
	user: [],
});
