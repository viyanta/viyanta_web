# utils/dms_access.py

def get_dms_allowed_ids(user) -> set[int]:
    """
    Parse IsDMSMenuTemplateID like '101|201|301'
    """
    if not user.IsDMSMenuTemplateID:
        return set()

    return {
        int(x)
        for x in str(user.IsDMSMenuTemplateID).split("|")
        if x.isdigit()
    }


def can_user_access_dms_menu(user, submenu_id: int) -> bool:
    # Master admin override
    if user.IsMasterAdmin == 1:
        return True

    # Not a DMS user
    if user.IsDMSUser != 1:
        return False

    allowed_ids = get_dms_allowed_ids(user)
    return submenu_id in allowed_ids
