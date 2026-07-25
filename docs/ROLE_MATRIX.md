# Role Matrix

| Permission | Super Admin | HRD | Admin Payroll |
|---|:---:|:---:|:---:|
| `dashboard.read` | ✓ | ✓ | ✓ |
| `employees.read` | ✓ | ✓ | ✓ |
| `employees.write` | ✓ | ✓ | — |
| `organization.write` | ✓ | ✓ | — |
| `employees.import` | ✓ | ✓ | — |
| `attendance.read` | ✓ | ✓ | ✓ |
| `attendance.write` | ✓ | ✓ | — |
| `payroll.read` | ✓ | ✓ | ✓ |
| `payroll.write` | ✓ | — | ✓ |
| `payroll.finalize` | ✓ | — | ✓ |
| `payslip.export.single` | ✓ | ✓ | ✓ |
| `payslip.export.bulk` | ✓ | — | ✓ |
| `activity.read` | ✓ | — | — |
| `users.manage` | ✓ | — | — |
| `settings.manage` | ✓ | — | — |

## Enforcement

- Sidebar dan tombol memakai matriks front-end.
- Route memakai `ProtectedRoute`.
- Table access memakai RLS.
- RPC sensitif memeriksa role ulang.
- Storage policy memeriksa role dan path.
- Trigger melindungi integritas meskipun request tidak berasal dari UI.
