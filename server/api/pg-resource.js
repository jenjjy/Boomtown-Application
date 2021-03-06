const strs = require('stringstream');

function tagsQueryString(tags, itemid, result) {
  /**
   * Challenge:
   * This function is recursive, and a little complicated.
   * Can you refactor it to be simpler / more readable?
   */
  const length = tags.length;
  return length === 0
    ? `${result};`
    : tags.shift() &&
        tagsQueryString(
          tags,
          itemid,
          `${result}($${tags.length + 1}, ${itemid})${length === 1 ? '' : ','}`
        );
}

module.exports = postgres => {
  return {
    async createUser({ fullname, email, password }) {
      const newUserInsert = {
        text:
          'INSERT INTO users(fullname, email, password) VALUES($1, $2, $3) RETURNING *', // Authentication - Server
        values: [fullname, email, password]
      };
      try {
        const user = await postgres.query(newUserInsert);
        return user.rows[0];
      } catch (e) {
        switch (true) {
          case /users_fullname_key/.test(e.message):
            throw 'An account with this username already exists.';
          case /users_email_key/.test(e.message):
            throw 'An account with this email already exists.';
          default:
            throw 'There was a problem creating your account.';
        }
      }
    },
    async getUserAndPasswordForVerification(email) {
      const findUserQuery = {
        text: 'SELECT * FROM users WHERE email = $1', // Authentication - Server
        values: [email]
      };
      try {
        const user = await postgres.query(findUserQuery);
        if (!user) throw 'User was not found.';
        return user.rows[0];
      } catch (e) {
        throw 'User was not found.';
      }
    },
    async getUserById(id) {
      const findUserQuery = {
        text: 'SELECT fullname, id, email FROM users WHERE id = $1',
        values: [id]
      };
      try {
        const user = await postgres.query(findUserQuery);
        if (!user) throw 'There is no user with matching id';
        return user.rows[0];
      } catch (e) {
        throw 'Unable to find user with id';
      }
    },

    async getItems(idToOmit) {
      try {
        const items = await postgres.query({
          text: `SELECT * FROM items ${idToOmit ? 'WHERE ownerid <> $1' : ''}`,
          values: idToOmit ? [idToOmit] : []
        });
        return items.rows;
      } catch (e) {
        throw 'Error fetching items.';
      }
    },
    async getItemsForUser(id) {
      try {
        const items = await postgres.query({
          text: `SELECT * FROM items WHERE ownerid = $1 ORDER BY created DESC`,
          values: [id]
        });
        return items.rows;
      } catch (e) {
        throw 'Error fetching items.';
      }
    },
    async getBorrowedItemsForUser(id) {
      try {
        const items = await postgres.query({
          text: `SELECT * FROM items WHERE borrowerid = $1 ORDER BY created DESC`,
          values: [id]
        });
        return items.rows;
      } catch (e) {
        throw 'Error fetching borrowed items.';
      }
    },
    // async updateBorrower() {
    //   try {
    //     const items = await postgres.query({
    //       text: `SELECT * FROM items WHERE borrowerid`,
    //       values: []
    //     });
    //     return items.rows;
    //   } catch (e) {
    //     throw '';
    //   }
    // },
    async getTags() {
      try {
        const tags = await postgres.query({
          text: `SELECT * FROM tags`
        });
        return tags.rows;
      } catch (e) {
        throw 'Error fetching tags.';
      }
    },
    async getTagsForItem(id) {
      try {
        const tagsQuery = {
          text: `SELECT * FROM tags WHERE id IN (SELECT tagid FROM itemtags WHERE itemid = $1)`, // @DONE: Advanced queries
          values: [id]
        };
        const tags = await postgres.query(tagsQuery);
        return tags.rows;
      } catch (e) {
        throw 'Error fetching tags for item.';
      }
    },
    async getItemById(id) {
      try {
        const itemQuery = {
          text: `SELECT * FROM items WHERE id  = $1`,
          values: [id]
        };
        const itemById = await postgres.query(itemQuery);
        return itemById.rows;
      } catch (e) {
        throw 'Error fetching tags for item.';
      }
    },
    async saveNewItem({ item, user }) {
      return new Promise((resolve, reject) => {
        /**
         * Begin transaction: open a long-lived connection
         * to a client from the client pool.
         */
        postgres.connect((err, client, done) => {
          try {
            // Begin postgres transaction
            client.query('BEGIN', async err => {
              // Convert image (file stream) to Base64
              // const imageStream = image.stream.pipe(strs('base64'));

              // let base64Str = '';
              // imageStream.on('data', data => {
              //   base64Str += data;
              // });

              // imageStream.on('end', async () => {
              // Image has been converted, begin saving things
              const { title, description, tags } = item;

              // Generate new Item query
              const newItemQuery = {
                text:
                  'INSERT INTO items (title, description, ownerid) VALUES ($1, $2, $3) RETURNING *',
                values: [title, description, user.id]
              };

              // Insert new Item
              const insertNewItem = await postgres.query(newItemQuery);
              // const itemId = newItem.rows[0].id;

              // const imageUploadQuery = {
              //   text:
              //     'INSERT INTO uploads (itemid, filename, mimetype, encoding, data) VALUES ($1, $2, $3, $4, $5) RETURNING *',
              //   values: [
              //     itemid,
              //     image.filename,
              //     image.mimetype,
              //     'base64',
              //     base64Str
              //   ]
              // };

              // Upload image
              // const uploadedImage = await client.query(imageUploadQuery);
              // const imageid = uploadedImage.rows[0].id;

              // Generate image relation query
              // -------------------------------

              // Insert image
              // -------------------------------

              // Generate tag relationships query (use the'tagsQueryString' helper function provided)
              const tagRelationshipQuery = {
                text: `INSERT INTO itemtags (tagid, itemid) VALUES ${tagsQueryString(
                  [...tags],
                  insertNewItem.rows[0].id,
                  ''
                )}`,
                values: tags.map(tag => tag.id)
              };

              // Insert tags
              const insertNewTag = await postgres.query(tagRelationshipQuery);

              // Commit the entire transaction!
              client.query('COMMIT', err => {
                if (err) {
                  throw err;
                }
                // release the client back to the pool
                done();
                resolve(insertNewItem.rows[0]);
              });
            });
            // });
          } catch (e) {
            // Something went wrong
            client.query('ROLLBACK', err => {
              if (err) {
                throw err;
              }
              // release the client back to the pool
              done();
            });
            switch (true) {
              case /uploads_itemid_key/.test(e.message):
                throw 'This item already has an image.';
              default:
                throw e;
            }
          }
        });
      });
    }
  };
};
