// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/repository
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Application} from '@loopback/core';
import {Client, createClientForHandler, expect} from '@loopback/testlab';
import {HttpServerLike, RestComponent, RestServer} from '../../..';
import {
  groceryNote,
  NoteController,
} from '../../fixtures/controllers/note.controller';
import {Note} from '../../fixtures/models/note.model';

describe('add method to controller via mixin', () => {
  let controller: NoteController;

  before(async () => {
    controller = new NoteController();
  });

  it(`non mixin method 'create' exists`, () => {
    expect('create' in controller).to.be.True();
    expect(typeof controller.findByTitle === 'function').to.be.True();
  });

  it(`mixin method 'findByTitle' exists`, async () => {
    expect('findByTitle' in controller).to.be.True();
    expect(typeof controller.findByTitle === 'function').to.be.True();
    const foundNote: Note[] = await controller.findByTitle('groceries');
    expect(foundNote.length).to.equal(1);
    expect(groceryNote).to.deepEqual(foundNote[0]);
  });

  it('mixin endpoint /notes/findByTitle reachable', async () => {
    const app = givenAnApplication();
    const server = await givenAServer(app);
    return whenIMakeRequestTo(server)
      .get('/notes/findByTitle/groceries')
      .expect(200)
      .expect([groceryNote.toJSON()]);
  });

  function givenAnApplication() {
    const app = new Application();
    app.component(RestComponent);
    app.controller(NoteController);
    return app;
  }

  async function givenAServer(app: Application) {
    return app.getServer(RestServer);
  }

  function whenIMakeRequestTo(serverOrApp: HttpServerLike): Client {
    return createClientForHandler(serverOrApp.requestHandler);
  }
});
