# utils/product_access.py

PRODUCTS = {
    "DIGITS_LIFE": "IsSubscribedDigitsLife",
    "DIGITS_NON_LIFE": "IssubscribedDigitsNonLife",
    "DIGITS_PLUS": "IsSubscribedDigitsPlus",
    "ASSURE_LIFE": "IsSubscribedAssureLife",
    "ASSURE_NON_LIFE": "IssubscribedAssureNonLife",
    "ASSURE_PLUS": "IsSubscribedAssurePlus",
}


def can_user_access_product(user, product_key: str) -> bool:
    """
    Central access control for product-based menus
    """
    # Master admin override
    if getattr(user, "IsMasterAdmin", False):
        return True

    flag_name = PRODUCTS.get(product_key)
    if not flag_name:
        return False

    return getattr(user, flag_name, False) is True
