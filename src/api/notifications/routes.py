from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, Notification, ItemChangeRequest, BoxItem, User, Shop, Admin_User, ShopSale
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime

notifications = Blueprint('notifications', __name__)

@notifications.route('/create', methods=['POST'])
@jwt_required()
def create_notification():
    current_user = get_jwt_identity()
    data = request.json

    try:
        new_notification = Notification(
            recipient_type=data['recipient_type'],
            recipient_id=data['recipient_id'],
            sender_type=current_user['type'],
            sender_id=current_user['id'],
            type=data['type'],
            content=data['content'],
            extra_data=data.get('extra_data', {})
        )

        db.session.add(new_notification)
        db.session.commit()
        return jsonify(new_notification.serialize()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        logging.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500

@notifications.route('/user', methods=['GET'])
@jwt_required()
def get_user_notifications():
    current_user = get_jwt_identity()
    user = User.query.get(current_user['id'])
    if not user:
        return jsonify({"error": "User not found"}), 403
    
    notifications = Notification.query.filter_by(recipient_id=user.id, recipient_type='user').order_by(Notification.created_at.desc()).all()
    return jsonify([notification.serialize() for notification in notifications]), 200

@notifications.route('/shop', methods=['GET'])
@jwt_required()
def get_shop_notifications():
    current_user = get_jwt_identity()
    shop = Shop.query.get(current_user['id'])
    if not shop:
        return jsonify({"error": "Shop not found"}), 403
    
    notifications = Notification.query.filter_by(recipient_id=shop.id, recipient_type='shop').order_by(Notification.created_at.desc()).all()
    return jsonify([notification.serialize() for notification in notifications]), 200

@notifications.route('/admin', methods=['GET'])
@jwt_required()
def get_amin_notifications():
    current_user = get_jwt_identity()
    admin = Admin_User.query.get(current_user['id'])
    if not admin:
        return jsonify({"error": "Admin not found"}), 404
    
    notifications = Notification.query.filter_by(recipient_type='admin').order_by(Notification.created_at.desc()).all()
    return jsonify([notification.serialize() for notification in notifications]), 200

@notifications.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_required()
def mark_notification_as_read(notification_id):
    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({"success": False, "error": "Notification not found"}), 404
    
    notification.is_read = True
    db.session.commit()
    return jsonify({"success": True, "message": "Notification marked as read"}), 200

@notifications.route('/<int:notification_id>/change_type', methods=['PATCH'])
@jwt_required()
def change_notification_type(notification_id):
    current_user = get_jwt_identity()
    if current_user['type'] != 'admin':
        return jsonify({"success": False, "error": "Only admins can change notification types"}), 403

    data = request.json
    new_type = data.get('type')

    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({"success": False, "error": "Notification not found"}), 404

    try:
        notification.type = new_type
        db.session.commit()
        return jsonify({"success": True, "message": "Notification type updated successfully"}), 200
    except ValueError:
        return jsonify({"success": False, "error": "Invalid notification type"}), 400

@notifications.route('/all', methods=['GET'])
@jwt_required()
def get_all_notifications():
    current_user = get_jwt_identity()
    if current_user['type'] not in ['SuperAdmin']:
        return jsonify({"error": "Unauthorized. Only Super Admins can access all notifications."}), 403
    
    try:
        notifications = Notification.query.order_by(Notification.created_at.desc()).all()
        return jsonify([notification.serialize() for notification in notifications]), 200
    except SQLAlchemyError as e:
        logging.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500

@notifications.route('/change-request', methods=['POST'])
@jwt_required()
def create_change_request():
    current_user = get_jwt_identity()
    
    if current_user['type'] != 'shop':
        return jsonify({'error': 'You must be logged in as a shop'}), 403
    
    current_shop = Shop.query.get(current_user['id'])
    
    if not current_shop:
        return jsonify({"error": "Shop not found"}), 404
    
    data = request.get_json()
    
    try:
        box_item = BoxItem.query.get(data['box_item_id'])
        if not box_item or box_item.sale_detail.shop_id != current_shop.id:
            return jsonify({"error": "Invalid box item"}), 400

        sale_id = box_item.sale_detail.sale_id
        if not sale_id:
            return jsonify({"error": "Sale not found"}), 400

        new_request = ItemChangeRequest(
            box_item_id=data['box_item_id'],
            shop_id=current_shop.id,
            original_item_name=box_item.item_name,
            proposed_item_name=data['proposed_item_name'],
            reason=data['reason']
        )
        db.session.add(new_request)
        db.session.flush()  # Asigna un ID a new_request sin hacer commit
        
        shop_sale = ShopSale.query.filter_by(sale_id=sale_id, shop_id=current_shop.id).first()
        if shop_sale:
            shop_sale.status = "changes_requested"
            db.session.add(shop_sale)
        
        # Create notification for admins
        admin_notification = Notification(
            recipient_type='admin',
            sender_type='shop',
            sale_id=sale_id,
            shop_id=current_shop.id,
            sender_id=current_shop.id,
            type="item_change_request",
            content=f"La tienda {current_shop.name} ha solicitado el cambio de {box_item.item_name} por {data['proposed_item_name']} para el pedido #{sale_id} (SaleDetail #{box_item.sale_detail.id}).",
            extra_data={
                'item_change_request_id': new_request.id,
                'original_item_name': box_item.item_name,
                'proposed_item_name': data['proposed_item_name']
            }
        )
        db.session.add(admin_notification)
        
        # Actualizar la notificación original
        original_notification = Notification.query.filter_by(       
            type="new_sale",
            recipient_type="shop",
            recipient_id=current_shop.id,
            sale_id=sale_id
        ).first()

        if original_notification:
            original_notification.type = "item_change_requested"
            original_notification.is_read = False
            original_notification.updated_at = datetime.utcnow()
            original_notification.content = f"Has solicitado cambiar el artículo {box_item.item_name} por {data['proposed_item_name']} en el pedido #{sale_id}. Esperando aprobación del administrador."
            db.session.add(original_notification)

        db.session.commit()

        return jsonify(new_request.serialize()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        logging.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500