export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: "ADMINISTRATOR" | "TECHNICIAN" | "DESIGNER" | "REQUESTOR";
  departmentId?: string;
};
