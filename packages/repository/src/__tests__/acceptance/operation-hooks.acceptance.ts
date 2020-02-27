// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/repository
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {DataSource} from 'loopback-datasource-juggler';
import {DefaultCrudRepository, juggler} from '../..';
import {Product, ProductRelations} from '../fixtures/models/product.model';

// This test shows the recommended way how to use @loopback/repository
// together with existing connectors when building LoopBack applications
describe('Operation hooks', () => {
  let repo: ProductRepository;
  beforeEach(givenProductRepository);

  it('supports operation hooks', async () => {
    const p = await repo.create({slug: 'pencil'});
    expect(repo.callCounter).to.equal(2);
    p.name = 'Red Pencil';
    await repo.save(p);
    expect(repo.callCounter).to.equal(4);
  });

  function givenProductRepository() {
    const db = new DataSource({
      connector: 'memory',
    });

    repo = new ProductRepository(db);
  }

  class ProductRepository extends DefaultCrudRepository<
    Product,
    typeof Product.prototype.id,
    ProductRelations
  > {
    constructor(dataSource: juggler.DataSource) {
      super(Product, dataSource);
    }

    callCounter: number = 0;

    definePersistedModel(entityClass: typeof Product) {
      const modelClass = super.definePersistedModel(entityClass);
      modelClass.observe('before save', async ctx => {
        this.callCounter++;
      });

      modelClass.observe('after save', async ctx => {
        this.callCounter++;
      });
      return modelClass;
    }
  }
});
