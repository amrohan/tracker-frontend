import { Routes } from "@angular/router";
import { CollectionContext } from "./core/collection-context";
import { authGuard, guestGuard } from "./core/guards";

export const routes: Routes = [
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login-page").then((m) => m.LoginPage),
  },
  {
    path: "register",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/register-page").then((m) => m.RegisterPage),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("./features/shell/shell").then((m) => m.Shell),
    children: [
      {
        path: "",
        pathMatch: "full",
        loadComponent: () =>
          import("./features/dashboard/dashboard-page").then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: "collections/new",
        loadComponent: () =>
          import("./features/builder/collection-builder").then(
            (m) => m.CollectionBuilder,
          ),
      },
      {
        path: "collections/:id/edit",
        loadComponent: () =>
          import("./features/builder/collection-builder").then(
            (m) => m.CollectionBuilder,
          ),
      },
      {
        path: "collections/:id",
        providers: [CollectionContext],
        children: [
          {
            path: "",
            loadComponent: () =>
              import("./features/collection/collection-page").then(
                (m) => m.CollectionPage,
              ),
            children: [
              {
                path: "",
                pathMatch: "full",
                loadComponent: () =>
                  import("./features/collection/table-view").then(
                    (m) => m.TableView,
                  ),
              },
              {
                path: "summary",
                loadComponent: () =>
                  import("./features/collection/summary-view").then(
                    (m) => m.SummaryView,
                  ),
              },
            ],
          },

          {
            path: "records/new",
            loadComponent: () =>
              import("./features/records/record-form-page").then(
                (m) => m.RecordFormPage,
              ),
          },
          {
            path: "records/:recordId/edit",
            loadComponent: () =>
              import("./features/records/record-form-page").then(
                (m) => m.RecordFormPage,
              ),
          },
          {
            path: "records/:recordId",
            loadComponent: () =>
              import("./features/records/record-detail-page").then(
                (m) => m.RecordDetailPage,
              ),
          },

          {
            path: "import",
            loadComponent: () =>
              import("./features/import/import-page").then((m) => m.ImportPage),
          },
        ],
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
