const knex = require("knex");
const app = require("../src/app");
const helpers = require("./test-helpers");

describe("Protected endpoints", () => {
  let db;

  const {
    testUsers,
    testArticles,
    testComments
  } = helpers.makeArticlesFixtures();

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("cleanup", () => helpers.cleanTables(db));

  afterEach("cleanup", () => helpers.cleanTables(db));

  beforeEach("insert articles", () =>
    helpers.seedArticlesTables(db, testUsers, testArticles, testComments)
  );

  const protectedEndpoints = [
    {
      name: "GET /api/articles/:article_id",
      path: "/api/articles/1",
      method: supertest(app).get
    },
    {
      name: "GET /api/articles/:article_id/comments",
      path: "/api/articles/1/comments",
      method: supertest(app).get
    },
    {
      name: "POST /api/comments",
      path: "/api/comments",
      method: supertest(app).post
    }
  ];

  protectedEndpoints.forEach(endpoint => {
    describe(endpoint.name, () => {
      it(`responds with 401 'Missing bearer token' when no bearer token`, () => {
        return endpoint
          .method(endpoint.path)
          .expect(401, { error: `Missing bearer token` });
      });

      it(`responds 401 'Unauthorized request' when invalid JWT secret`, () => {
        //const userNoCreds = { user_name: "", password: "" };
        const validUser = testUsers[0];
        const invalidSecret = "bad-secret";
        return endpoint
          .method(endpoint.path)
          .set(
            "Authorization",
            helpers.makeAuthHeader(validUser, invalidSecret)
          )
          .expect(401, { error: "Unauthorized request" });
      });

      it(`responds 401 'Unauthorized request' when invalid sub in payload`, () => {
        //const userInvalidCreds = {user_name: "user-not", password: "existy"};
        const invalidUser = { user_name: "user-not-existy", id: 1 };
        return endpoint
          .method(endpoint.path)
          .set("Authorization", helpers.makeAuthHeader(invalidUser))
          .expect(401, { error: "Unauthorized request" });
      });
      /* ====== NO LONGER RELEVANT ========
      it.skip(`responds 401 'Unauthorized request' when invalid password`, () => {
        const userInvalidPass = {
          user_name: testUsers[0].user_name,
          password: "wrong"
        };
        return endpoint
          .method("/api/articles/1")
          .set("Authorization", helpers.makeAuthHeader(userInvalidPass))
          .expect(401, { error: "Unauthorized request" });
      });
      */
    });
  });
});
