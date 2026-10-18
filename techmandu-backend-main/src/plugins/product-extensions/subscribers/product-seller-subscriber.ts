import { EventSubscriber, EntitySubscriberInterface, InsertEvent, Connection } from 'typeorm';
import { Product, Channel, Injector, TransactionalConnection, RequestContext } from '@vendure/core';
import { Injectable } from '@nestjs/common';


@EventSubscriber()
export class ProductSellerSubscriber implements EntitySubscriberInterface<Product> {
    
    constructor(private connection: Connection) {
        connection.subscribers.push(this);
    }

    listenTo() {
        return Product;
    }

    async beforeInsert(event: InsertEvent<Product>) {
        
    }
}